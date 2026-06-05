import { useCallback, useEffect, useRef, useState } from "react";

export type MicPermissionState =
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported"
  | "error";

interface UseMicrophoneResult {
  audioTrack: MediaStreamTrack | null;
  permissionState: MicPermissionState;
  errorMessage: string | null;
  isMuted: boolean;
  requestMicrophone: () => Promise<boolean>;
  toggleMute: () => void;
  stopMicrophone: () => void;
}

export function useMicrophone(): UseMicrophoneResult {
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [permissionState, setPermissionState] =
    useState<MicPermissionState>("prompt");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const stopMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setAudioTrack(null);
  }, []);

  const requestMicrophone = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState("unsupported");
      setErrorMessage("Your browser does not support microphone access.");
      return false;
    }

    try {
      stopMicrophone();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      const track = stream.getAudioTracks()[0];
      if (!track) {
        throw new Error("No audio track available.");
      }

      streamRef.current = stream;
      setAudioTrack(track);
      setIsMuted(false);
      setPermissionState("granted");
      setErrorMessage(null);
      return true;
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
      } else {
        setPermissionState("error");
        setErrorMessage(error.message || "Failed to access microphone.");
      }
      stopMicrophone();
      return false;
    }
  }, [stopMicrophone]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioTrack) {
        audioTrack.enabled = !next;
      }
      return next;
    });
  }, [audioTrack]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
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
