import { useMutation } from "@tanstack/react-query";
import apiEndPoints from "../../../services/apiEndPoints";
import makeApiRequest from "../../../services/makeApiRequest";

// Define types for the data parameters
interface LoginData {
  username: string;
  password: string;
}

interface RegistrationData {
  username: string;
  full_name: string;
  password: string;
  confirm_password: string;
}

// Device login hook
const useDeviceLogin = () => {
  return useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await makeApiRequest.post(
        apiEndPoints.DEVICE_LOGIN,
        data,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.device) {
        document.cookie = `deviceId=${data.device.device_id}; path=/; max-age=${
          60 * 60 * 24 * 30
        }`;
      }
    },
  });
};

// Device registration hook
const useDeviceRegistration = () => {
  return useMutation({
    mutationFn: async (data: RegistrationData) => {
      const response = await makeApiRequest.post(
        apiEndPoints.DEVICE_REGISTER,
        data,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.device) {
        document.cookie = `deviceId=${data.device.device_id}; path=/; max-age=${
          60 * 60 * 24 * 30
        }`;
      }
    },
  });
};

const useAnonymousDeviceRegistration = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await makeApiRequest.post(
        apiEndPoints.USER_DEVICE_REGISTRATION,
        {},
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      document.cookie = `deviceId=${data.device_id}; path=/; max-age=${
        60 * 60 * 24 * 30
      }`;
    },
  });
};

export {
  useDeviceLogin,
  useDeviceRegistration,
  useAnonymousDeviceRegistration,
};
