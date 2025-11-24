import { useState, useEffect, useRef } from 'react';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

interface MaskDetectionResult {
  isWearingMask: boolean;
  confidence: number;
  faceDetected: boolean;
}

export const useWebcamMaskDetection = (enabled: boolean) => {
  const [result, setResult] = useState<MaskDetectionResult>({
    isWearingMask: false,
    confidence: 0,
    faceDetected: false,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize MediaPipe Face Detector
  useEffect(() => {
    if (!enabled) return;

    const initializeFaceDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU"
          },
          runningMode: "VIDEO"
        });

        faceDetectorRef.current = detector;
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize face detector:', error);
      }
    };

    initializeFaceDetector();

    return () => {
      faceDetectorRef.current?.close();
    };
  }, [enabled]);

  // Start webcam and detection
  useEffect(() => {
    if (!enabled || !isInitialized) {
      // Stop webcam if disabled
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      return;
    }

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 }
        });
        
        streamRef.current = stream;
        
        // Create hidden video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        videoRef.current = video;

        // Battery-optimized detection loop - sample every 15 seconds
        const detectMask = () => {
          if (!videoRef.current || !faceDetectorRef.current || !enabled) return;

          const detector = faceDetectorRef.current;
          const video = videoRef.current;

          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            const detections = detector.detectForVideo(video, performance.now());
            
            if (detections.detections.length > 0) {
              const face = detections.detections[0];
              
              // Analyze face coverage to detect mask
              // If lower face (mouth/nose area) is occluded, likely wearing mask
              const keypoints = face.keypoints || [];
              
              // Simple heuristic: if we detect face but keypoints are limited,
              // it suggests face is partially covered (mask)
              const hasLimitedKeypoints = keypoints.length < 4;
              const isWearingMask = hasLimitedKeypoints;
              
              setResult({
                faceDetected: true,
                isWearingMask,
                confidence: face.categories?.[0]?.score || 0,
              });
            } else {
              setResult({
                faceDetected: false,
                isWearingMask: false,
                confidence: 0,
              });
            }
          }
        };

        let detectionInterval: NodeJS.Timeout;
        
        video.onloadeddata = () => {
          // Initial detection
          detectMask();
          // Continue detection every 15 seconds for battery optimization
          detectionInterval = setInterval(detectMask, 15000);
        };

        return () => {
          if (detectionInterval) {
            clearInterval(detectionInterval);
          }
        };

      } catch (error) {
        console.error('Webcam access denied:', error);
      }
    };

    startWebcam();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [enabled, isInitialized]);

  return result;
};
