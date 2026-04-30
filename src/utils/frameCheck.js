import * as faceapi from "face-api.js";

export async function loadModels() {
  const manifestUrl = "/models/tiny_face_detector_model-weights_manifest.json";
  const manifestResponse = await fetch(manifestUrl, { cache: "no-store" });

  if (!manifestResponse.ok) {
    throw new Error(
      "Face framing models are missing. Add the tiny face detector files to public/models.",
    );
  }

  const contentType = manifestResponse.headers.get("content-type") || "";
  if (!contentType.includes("json")) {
    throw new Error(
      "Face framing model manifest is invalid. Make sure public/models contains the face-api weights files.",
    );
  }

  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
}

export async function detectFace(videoElement) {
  const detection = await faceapi.detectSingleFace(
    videoElement,
    new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }),
  );

  if (!detection) {
    return { status: "no_face", box: null };
  }

  const { x, y, width, height } = detection.box;
  const videoW = videoElement.videoWidth;
  const videoH = videoElement.videoHeight;

  const faceCenterX = x + width / 2;
  const faceCenterY = y + height / 2;

  const inCenterX = faceCenterX > videoW * 0.25 && faceCenterX < videoW * 0.75;
  const inCenterY = faceCenterY > videoH * 0.2 && faceCenterY < videoH * 0.8;

  const faceRatio = width / videoW;
  if (faceRatio < 0.15) {
    return { status: "too_far", box: detection.box };
  }
  if (faceRatio > 0.7) {
    return { status: "too_close", box: detection.box };
  }

  if (!inCenterX || !inCenterY) {
    return { status: "off_center", box: detection.box };
  }

  return { status: "good", box: detection.box };
}
