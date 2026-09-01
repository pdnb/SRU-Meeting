"use client";

import { ImagePlus, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  BACKGROUND_PRESETS,
  presetImageUrl,
  shouldShowBackgroundPerformanceHint,
  virtualBackgroundBlurAvailable,
  virtualBackgroundChoiceLabel,
  type PersistedVirtualBackgroundChoice,
  type VirtualBackgroundChoice,
  type VirtualBackgroundPresetId,
} from "@/lib/livekit/track-preferences";
import { useTrackProcessorSupport } from "@/components/meeting/useTrackProcessorSupport";
import { useVirtualBackgroundPreference } from "@/components/meeting/useVirtualBackgroundPreference";

type BackgroundPresetDto = {
  id: string;
  label: string;
  imageUrl: string;
};

type BackgroundCatalog = {
  showBuiltinBackgrounds: boolean;
  builtIn: BackgroundPresetDto[];
  org: BackgroundPresetDto[];
};

function isChoiceSelected(
  choice: VirtualBackgroundChoice,
  option: VirtualBackgroundChoice,
): boolean {
  if (choice.type !== option.type) {
    return false;
  }
  if (choice.type === "none" || choice.type === "blur") {
    return true;
  }
  if (choice.type === "custom" && option.type === "custom") {
    return choice.objectUrl === option.objectUrl;
  }
  if (
    (choice.type === "preset" || choice.type === "org") &&
    (option.type === "preset" || option.type === "org")
  ) {
    return choice.id === option.id;
  }
  return false;
}

function BackgroundOption({
  label,
  selected,
  onClick,
  imageUrl,
  placeholder,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  imageUrl?: string;
  placeholder?: string;
}) {
  return (
    <button
      type="button"
      className="sru-bg-gallery-option"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
    >
      <span className="sru-bg-gallery-thumb">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="sru-bg-gallery-thumb-placeholder">{placeholder}</span>
        )}
      </span>
      <span className="sru-bg-gallery-label">{label}</span>
    </button>
  );
}

export function BackgroundGalleryModal({
  showUnsupportedNotice = false,
  compact = false,
  controlId,
}: {
  showUnsupportedNotice?: boolean;
  compact?: boolean;
  controlId?: string;
}) {
  const generatedId = useId();
  const triggerId = controlId ?? generatedId;
  const dialogTitleId = `${triggerId}-title`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { virtualBackground: supported } = useTrackProcessorSupport();
  const blurAvailable = virtualBackgroundBlurAvailable(supported);
  const {
    choice,
    setChoice,
    setSessionCustomFromFile,
  } = useVirtualBackgroundPreference();
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<BackgroundCatalog | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch("/api/v1/backgrounds");
      if (!res.ok) {
        return;
      }
      const json = (await res.json()) as { data: BackgroundCatalog };
      setCatalog(json.data);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    if (open && !catalog && !loadingCatalog) {
      void loadCatalog();
    }
  }, [catalog, loadCatalog, loadingCatalog, open]);

  if (!supported) {
    if (!showUnsupportedNotice) {
      return null;
    }
    return (
      <p className="text-caption text-zinc-400">
        Virtual backgrounds are not available in this browser.
      </p>
    );
  }

  const orgLabel =
    choice.type === "org"
      ? catalog?.org.find((item) => item.id === choice.id)?.label
      : undefined;
  const showHint = shouldShowBackgroundPerformanceHint(choice);
  const currentLabel = virtualBackgroundChoiceLabel(choice, orgLabel);

  const previewUrl =
    choice.type === "custom"
      ? choice.objectUrl
      : choice.type === "org"
        ? catalog?.org.find((item) => item.id === choice.id)?.imageUrl
        : choice.type === "preset"
          ? presetImageUrl(
              BACKGROUND_PRESETS.find((preset) => preset.id === choice.id)
                ?.path ?? "/backgrounds/office.jpg",
            )
          : undefined;

  const selectPersisted = (next: PersistedVirtualBackgroundChoice) => {
    setUploadError(null);
    setChoice(next);
    setOpen(false);
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    const result = setSessionCustomFromFile(file);
    if (!result.ok) {
      setUploadError(result.message);
      return;
    }
    setUploadError(null);
    setOpen(false);
  };

  return (
    <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-2"}>
      <label
        htmlFor={triggerId}
        className={compact ? "sr-only" : "sru-label"}
      >
        Background
      </label>
      <button
        id={triggerId}
        type="button"
        className="sru-bg-gallery-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${triggerId}-dialog`}
        onClick={() => setOpen(true)}
      >
        <span className="sru-bg-gallery-trigger-thumb">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : choice.type === "blur" ? (
            <Sparkles className="h-4 w-4 opacity-70" aria-hidden />
          ) : null}
        </span>
        <span>{currentLabel}</span>
      </button>

      {open ? (
        <div
          className="sru-bg-gallery-backdrop"
          onClick={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        >
          <div
            id={`${triggerId}-dialog`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="sru-bg-gallery-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sru-bg-gallery-header">
              <h2 id={dialogTitleId} className="text-body font-semibold">
                Choose background
              </h2>
              <button
                type="button"
                className="sru-meet-btn"
                aria-label="Close background picker"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="sru-bg-gallery-grid">
              <BackgroundOption
                label="None"
                selected={isChoiceSelected(choice, { type: "none" })}
                onClick={() => selectPersisted({ type: "none" })}
              />
              {blurAvailable ? (
                <BackgroundOption
                  label="Blur"
                  selected={isChoiceSelected(choice, { type: "blur" })}
                  onClick={() => selectPersisted({ type: "blur" })}
                  placeholder="Blur"
                />
              ) : null}
              {catalog?.builtIn.map((preset) => (
                <BackgroundOption
                  key={preset.id}
                  label={preset.label}
                  imageUrl={preset.imageUrl}
                  selected={isChoiceSelected(choice, {
                    type: "preset",
                    id: preset.id as VirtualBackgroundPresetId,
                  })}
                  onClick={() =>
                    selectPersisted({
                      type: "preset",
                      id: preset.id as VirtualBackgroundPresetId,
                    })
                  }
                />
              ))}
              {catalog?.org.map((preset) => (
                <BackgroundOption
                  key={preset.id}
                  label={preset.label}
                  imageUrl={preset.imageUrl}
                  selected={isChoiceSelected(choice, {
                    type: "org",
                    id: preset.id,
                  })}
                  onClick={() =>
                    selectPersisted({ type: "org", id: preset.id })
                  }
                />
              ))}
              <button
                type="button"
                className="sru-bg-gallery-option"
                aria-label="Upload background image"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="sru-bg-gallery-thumb sru-bg-gallery-thumb-upload">
                  <ImagePlus className="h-5 w-5" aria-hidden />
                </span>
                <span className="sru-bg-gallery-label">Upload image</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                void handleUpload(file);
                event.target.value = "";
              }}
            />

            {loadingCatalog ? (
              <p className="text-caption sru-meet-muted">Loading backgrounds…</p>
            ) : null}
            {uploadError ? (
              <p role="alert" className="sru-error text-caption">
                {uploadError}
              </p>
            ) : null}
            {showHint || (!blurAvailable && choice.type === "blur") ? (
              <p className="text-caption text-amber-300/90" role="status">
                {!blurAvailable && choice.type === "blur"
                  ? "Background blur is disabled on mobile to save battery."
                  : "Background effects use extra CPU on this device. Turn off blur or presets if video stutters."}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
