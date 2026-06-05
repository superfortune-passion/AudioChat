import { useCallback, useEffect, useRef, useState } from "react";

export type MicPermissionState =
  | "prompt"
  | "denied"
  | "unsupported"
  | "error"
  | "granted";

interface UseMicrophoneResult {
  audioTrack: MediaStreamTrack | null;
  permissionState: MicPermissionState;
  errorMessage: string | null;
  isMuted: boolean;
  requestMicrophone: () => Promise<boolean>;
  toggleMute: () => void;
  stopMicrophone: () => void;
}

function hasLiveAudioTrack(stream: MediaStream | null): boolean {
  if (!stream) return false;
  return stream.getAudioTracks().some((track) => track.readyState === "live");
}

export function useMicrophone(): UseMicrophoneResult {
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [permissionState, setPermissionState] =
    useState<MicPermissionState>("prompt");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const stopMicrophone = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
    setAudioTrack(null);
    setIsMuted(false);
    setPermissionState("prompt");
    setErrorMessage(null);
  }, []);

  const bindStream = useCallback((stream: MediaStream) => {
    const track = stream.getAudioTracks()[0];
    if (!track || track.readyState !== "live") {
      return false;
    }

    track.onended = () => {
      if (streamRef.current === stream) {
        stopMicrophone();
      }
    };

    streamRef.current = stream;
    setAudioTrack(track);
    setIsMuted(false);
    setPermissionState("granted");
    setErrorMessage(null);
    return true;
  }, [stopMicrophone]);

  const requestMicrophone = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState("unsupported");
      setErrorMessage("Your browser does not support microphone access.");
      return false;
    }

    if (hasLiveAudioTrack(streamRef.current)) {
      const track = streamRef.current!.getAudioTracks()[0];
      setAudioTrack(track);
      setPermissionState("granted");
      setErrorMessage(null);
      return true;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setAudioTrack(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return bindStream(stream);
    } catch (err) {
      const error = err as DOMException;
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setPermissionState("denied");
        setErrorMessage(
          "Microphone access was denied. Enable it in your browser settings to jam."
        );
      } else if (error.name === "NotFoundError") {
        setPermissionState("error");
        setErrorMessage("No microphone found. Connect a mic and try again.");
      } else if (error.name === "NotReadableError") {
        setPermissionState("error");
        setErrorMessage(
          "Microphone is in use by another app. Close it and try again."
        );
      } else {
        setPermissionState("error");
        setErrorMessage(error.message || "Failed to access microphone.");
      }
      stopMicrophone();
      return false;
    }
  }, [bindStream, stopMicrophone]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      const track = streamRef.current?.getAudioTracks()[0] ?? audioTrack;
      if (track && track.readyState === "live") {
        track.enabled = !next;
      }
      return next;
    });
  }, [audioTrack]);

  useEffect(() => {
    const releaseMicOnExit = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    window.addEventListener("pagehide", releaseMicOnExit);
    window.addEventListener("beforeunload", releaseMicOnExit);

    return () => {
      window.removeEventListener("pagehide", releaseMicOnExit);
      window.removeEventListener("beforeunload", releaseMicOnExit);
      releaseMicOnExit();
    };
  }, []);

  return {
    audioTrack,
    permissionState,
    errorMessage,
    isMuted,
    requestMicrophone,
    toggleMute,
    stopMicrophone,
  };
}
