const getMicrophoneConstraints = (
  microphoneDeviceId?: string
): MediaStreamConstraints[] => {
  const deviceId = microphoneDeviceId?.trim();

  if (!deviceId || deviceId === "default") {
    return [{ audio: true }];
  }

  return [
    {
      audio: {
        deviceId: { ideal: deviceId },
      },
    },
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
