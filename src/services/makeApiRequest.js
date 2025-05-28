import axios from "axios";

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_BASEURL,
  withCredentials: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/json",
  },
});

// Get deviceId from cookies
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

// Add an interceptor to include device ID from cookies in requests if needed
instance.interceptors.request.use((config) => {
  document.body.style.cursor = "wait";

  const deviceId = getCookie("deviceId");

  // Always set device ID if available (don't check if it already exists)
  if (deviceId) {
    config.headers["X-Device-ID"] = deviceId;
  }

  return config;
});

instance.interceptors.response.use(
  (response) => {
    document.body.style.cursor = "default";

    // If the response contains a device_id, store it in a cookie
    if (response.data && response.data.device_id) {
      const cookieValue = `deviceId=${
        response.data.device_id
      }; path=/; max-age=${60 * 60 * 24 * 30}`;
      document.cookie = cookieValue;
    }

    return response;
  },
  async (error) => {
    document.body.style.cursor = "default";

    return Promise.reject(error);
  }
);

export default instance;
