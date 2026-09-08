import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, Upload, AlertCircle, Sparkles, SwitchCamera } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64DataUrl: string) => void;
  productName?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  productName,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);

  // Stop camera tracks helper
  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Start Camera Stream
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    stopCameraStream();
    setCameraError(null);
    setIsInitializing(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device API is not supported in this browser environment.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please allow camera permissions in your browser bar, or upload an image file directly below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No video camera device was found on this workstation. You can upload an image file from your disk.');
      } else {
        setCameraError(err.message || 'Unable to access device camera. Please check camera permissions.');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera(facingMode);
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode]);

  // Handle Close
  const handleClose = () => {
    stopCameraStream();
    setCapturedImage(null);
    setCameraError(null);
    onClose();
  };

  // Switch between front and back camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setCapturedImage(null);
    startCamera(nextMode);
  };

  // Snap Snapshot
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Trigger visual shutter flash
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    const canvas = canvasRef.current || document.createElement('canvas');
    const width = video.videoWidth || 800;
    const height = video.videoHeight || 600;

    // Keep aspect ratio with max dimension 900px for optimal sheet storage size
    const maxDim = 900;
    let targetW = width;
    let targetH = height;

    if (targetW > maxDim || targetH > maxDim) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, targetW, targetH);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      stopCameraStream();
    }
  };

  // File Upload fallback / direct import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 900;
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setCapturedImage(compressed);
          stopCameraStream();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Confirm and save
  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-[#141414] border border-white/20 rounded-xs text-[#fcfaf7] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1a1a1a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xs bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-serif font-semibold text-white tracking-wide">
                Hardware Camera Capture
              </h3>
              <p className="text-[10px] text-white/50 truncate max-w-xs font-mono">
                {productName ? `Item: ${productName}` : 'Capture product photo for catalog'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!capturedImage && (
              <button
                type="button"
                onClick={toggleFacingMode}
                title="Switch Camera (Front/Rear)"
                className="p-2 border border-white/15 hover:border-white/40 bg-white/5 hover:bg-white/10 rounded-xs text-xs text-white/80 transition-all flex items-center gap-1.5"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px] uppercase font-mono">
                  {facingMode === 'environment' ? 'Rear' : 'Front'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-white/50 hover:text-white rounded-xs hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] sm:min-h-[380px] overflow-hidden">
          {/* Shutter flash animation */}
          {flashEffect && (
            <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />
          )}

          {/* Captured Preview */}
          {capturedImage ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
              <img
                src={capturedImage}
                alt="Captured hardware preview"
                className="max-h-[340px] max-w-full object-contain rounded-xs border border-white/20 shadow-lg"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-3">
                <span className="px-3 py-1 bg-black/70 border border-white/20 rounded-full text-[10px] text-amber-300 font-mono">
                  Photo Captured • Ready to attach
                </span>
              </div>
            </div>
          ) : (
            /* Live Camera Feed */
            <div className="relative w-full h-full flex items-center justify-center bg-[#0d0d0d]">
              {cameraError ? (
                <div className="p-6 text-center space-y-3 max-w-md">
                  <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-medium text-white">Camera Unavailable</h4>
                  <p className="text-xs text-white/60 leading-relaxed">{cameraError}</p>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xs text-[10px] uppercase tracking-wider font-mono flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-xs text-[10px] uppercase tracking-wider font-mono flex items-center gap-1.5"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Choose File from Disk</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover max-h-[400px]"
                  />

                  {/* Optical Hardware Framing Overlay */}
                  <div className="absolute inset-8 sm:inset-12 border border-white/30 rounded-xs pointer-events-none flex flex-col justify-between p-2">
                    <div className="flex justify-between text-[9px] font-mono text-white/50 tracking-widest uppercase">
                      <span>[ALIGN HARDWARE]</span>
                      <span>[1:1 PHOTO]</span>
                    </div>
                    {/* Viewfinder crosshairs */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-[1px] bg-amber-400/40" />
                      <div className="h-12 w-[1px] bg-amber-400/40 absolute" />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-amber-300/60 uppercase">
                      <span>MAIGAMBA OPTICAL</span>
                      <span>AUTO-FOCUS</span>
                    </div>
                  </div>

                  {isInitializing && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-2 text-xs font-mono text-white">
                      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span>Initializing sensor...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-[#1a1a1a] border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2 border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake Photo</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-white/60 hover:text-white text-[10px] uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-xs text-[10px] uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Attach Image to Product</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-white/80 rounded-xs text-[10px] uppercase tracking-wider font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload From File</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-2 text-white/50 hover:text-white text-[10px] uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSnap}
                  disabled={isInitializing || !!cameraError}
                  className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:pointer-events-none text-black font-semibold rounded-xs text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Photo</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
