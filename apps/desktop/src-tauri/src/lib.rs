use std::sync::Mutex;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_shell::ShellExt;
use url::Url;

struct PendingPath(Mutex<Option<String>>);

fn server_url() -> &'static str {
    option_env!("SRU_SERVER_URL").unwrap_or("http://127.0.0.1:3000")
}

fn absolute_url(path: &str) -> Result<Url, String> {
    let base = server_url().trim_end_matches('/');
    let joined = if path.starts_with('/') {
        format!("{base}{path}")
    } else {
        format!("{base}/{path}")
    };
    joined.parse::<Url>().map_err(|error| error.to_string())
}

fn focus_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn navigate_main_window(app: &AppHandle, path: &str) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window is not ready".to_string())?;
    let url = absolute_url(path)?;
    window.navigate(url).map_err(|error| error.to_string())?;
    focus_main_window(app);
    Ok(())
}

fn handle_deep_link(app: &AppHandle, raw: &str, pending: &PendingPath) {
    let Ok(parsed) = raw.parse::<Url>() else {
        return;
    };

    if parsed.scheme() != "sru-meeting" {
        return;
    }

    let host = parsed.host_str().unwrap_or_default();
    let path = parsed.path();

    let target = if host == "auth" && path == "/callback" {
        parsed
            .query_pairs()
            .find(|(key, _)| key == "ticket")
            .map(|(_, ticket)| format!("/api/auth/desktop/session?ticket={ticket}"))
    } else if host == "rooms" {
        let room_id = path.trim_start_matches('/');
        if room_id.is_empty() {
            None
        } else {
            Some(format!("/join/{room_id}"))
        }
    } else {
        None
    };

    let Some(path) = target else {
        return;
    };

    if navigate_main_window(app, &path).is_err() {
        if let Ok(mut pending_path) = pending.0.lock() {
            *pending_path = Some(path);
        }
    }
}

#[tauri::command]
fn navigate_to(app: AppHandle, path: String) -> Result<(), String> {
    navigate_main_window(&app, &path)
}

#[tauri::command]
fn focus_window(app: AppHandle) -> Result<(), String> {
    focus_main_window(&app);
    Ok(())
}

#[tauri::command]
async fn show_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|error| error.to_string())?;
    focus_main_window(&app);
    Ok(())
}

#[tauri::command]
async fn open_sso(app: AppHandle, provider: String) -> Result<(), String> {
    let url = absolute_url(&format!("/api/auth/desktop/start?provider={provider}"))?;
    app.shell()
        .open(url.as_str(), None)
        .map_err(|error| error.to_string())
}

fn create_main_window(app: &AppHandle) -> Result<(), String> {
    if app.get_webview_window("main").is_some() {
        return Ok(());
    }

    let url = absolute_url("/app")?;
    WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
        .title("SRU Meeting")
        .inner_size(1280.0, 800.0)
        .min_inner_size(960.0, 640.0)
        .build()
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn build_tray(app: &AppHandle) -> Result<(), String> {
    let show = MenuItem::with_id(app, "show", "Show SRU Meeting", true, None::<&str>)
        .map_err(|error| error.to_string())?;
    let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)
        .map_err(|error| error.to_string())?;
    let sign_in = MenuItem::with_id(app, "sign-in", "Sign in", true, None::<&str>)
        .map_err(|error| error.to_string())?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)
        .map_err(|error| error.to_string())?;
    let menu = Menu::with_items(app, &[&show, &hide, &sign_in, &quit])
        .map_err(|error| error.to_string())?;

    let icon = app
        .default_window_icon()
        .ok_or_else(|| "application icon is missing".to_string())?
        .clone();

    TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("SRU Meeting")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                focus_main_window(app);
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "sso" | "sign-in" => {
                let app = app.clone();
                let _ = navigate_main_window(&app, "/login");
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                focus_main_window(tray.app_handle());
            }
        })
        .build(app)
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PendingPath(Mutex::new(None)))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let pending = app.state::<PendingPath>();
            for arg in argv {
                if arg.starts_with("sru-meeting:") {
                    handle_deep_link(app, arg, pending.inner());
                }
            }
            focus_main_window(app);
        }))
        .invoke_handler(tauri::generate_handler![
            navigate_to,
            focus_window,
            show_notification,
            open_sso
        ])
        .setup(|app| {
            create_main_window(app.handle())?;
            build_tray(app.handle())?;

            if let Ok(mut pending) = app.state::<PendingPath>().0.lock() {
                if let Some(path) = pending.take() {
                    let _ = navigate_main_window(app.handle(), &path);
                }
            }

            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    let pending = handle.state::<PendingPath>();
                    for url in event.urls() {
                        handle_deep_link(&handle, url.as_str(), pending.inner());
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running SRU Meeting desktop");
}
