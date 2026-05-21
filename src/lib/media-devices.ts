const getMicrophoneConstraints = (
  microphoneDeviceId?: string
): MediaStreamConstraints[] => {
  const deviceId = microphoneDeviceId?.trim();

  const optimalAudio = {
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 16000 },
    echoCancellation: true,
    noiseSuppression: true,
  };

  const monoAudio = {
    channelCount: { ideal: 1 },
    echoCancellation: true,
    noiseSuppression: true,
  };

  const genericAudio = {
    echoCancellation: true,
    noiseSuppression: true,
  };

  if (!deviceId || deviceId === "default") {
    return [
      { audio: optimalAudio },
      { audio: monoAudio },
      { audio: genericAudio },
      { audio: true },
    ];
  }

  return [
    {
      audio: {
        deviceId: { ideal: deviceId },
        ...optimalAudio,
      },
    },
    {
      audio: {
        deviceId: { ideal: deviceId },
        ...monoAudio,
      },
    },
    {
      audio: {
        deviceId: { ideal: deviceId },
        ...genericAudio,
      },
    },
    { audio: genericAudio },
    { audio: true },
  ];
};

const shouldTryDefaultMicrophone = (error: unknown) => {
  if (!(error instanceof DOMException)) {
    return false;
  }

  return (
    error.name === "OverconstrainedError" ||
    error.name === "ConstraintError" ||
    error.message.toLowerCase().includes("invalid constraint")
  );
};

export const getMicrophoneStream = async (microphoneDeviceId?: string) => {
  const constraintsList = getMicrophoneConstraints(microphoneDeviceId);
  let lastError: unknown;

  for (const [index, constraints] of constraintsList.entries()) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;

      if (index === constraintsList.length - 1 || !shouldTryDefaultMicrophone(error)) {
        break;
      }
    }
  }

  throw lastError;
};
