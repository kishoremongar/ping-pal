import { useState, useEffect, FormEvent } from "react";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import Head from "next/head";
import {
  useDeviceLogin,
  useDeviceRegistration,
  useAnonymousDeviceRegistration,
} from "../../app/_home/_hooks/useConnect";

// Define form data interface
interface FormDataState {
  username: string;
  fullName: string;
  password: string;
  confirmPassword: string;
}

// Extracted form component
const AuthForm = ({
  isLoginMode,
  formData,
  errors,
  loading,
  handleInputChange,
  handleUsernameKeyDown,
  handleSubmit,
  renderLoginButtonText,
}: {
  isLoginMode: boolean;
  formData: FormDataState;
  errors: any;
  loading: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUsernameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent) => void;
  renderLoginButtonText: () => React.ReactNode;
}) => (
  <form onSubmit={handleSubmit} className="space-y-4">
    {/* Username */}
    <div>
      <label
        htmlFor="username"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Username
      </label>
      <input
        type="text"
        id="username"
        name="username"
        value={formData.username}
        onChange={handleInputChange}
        onKeyDown={handleUsernameKeyDown}
        className={`w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          errors.username ? "border-red-500" : "border-gray-300"
        }`}
        placeholder="Enter your username (lowercase, no spaces)"
        disabled={loading}
        autoComplete="username"
        pattern="[a-z0-9_-]*"
        title="Username can only contain lowercase letters, numbers, underscores, and hyphens"
      />

      {errors.username && (
        <p className="mt-1 text-sm text-red-600">{errors.username}</p>
      )}
    </div>

    {/* Full Name (Registration only) */}
    {!isLoginMode && (
      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Full Name
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          value={formData.fullName}
          onChange={handleInputChange}
          className={`w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.fullName ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Enter your full name"
          disabled={loading}
        />
        {errors.fullName && (
          <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
        )}
      </div>
    )}

    {/* Password */}
    <div>
      <label
        htmlFor="password"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Password
      </label>
      <input
        type="password"
        id="password"
        name="password"
        value={formData.password}
        onChange={handleInputChange}
        className={`w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          errors.password ? "border-red-500" : "border-gray-300"
        }`}
        placeholder="Enter your password"
        disabled={loading}
      />
      {errors.password && (
        <p className="mt-1 text-sm text-red-600">{errors.password}</p>
      )}
    </div>

    {/* Confirm Password (Registration only) */}
    {!isLoginMode && (
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Confirm Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          className={`w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.confirmPassword ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Confirm your password"
          disabled={loading}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
        )}
      </div>
    )}

    {/* Submit Button */}
    <button
      type="submit"
      className={`w-full ${
        loading ? "bg-blue-300" : "bg-blue-500 hover:bg-blue-600"
      } text-white rounded-md p-2 transition font-medium`}
      disabled={loading}
    >
      {renderLoginButtonText()}
    </button>
  </form>
);

// Extracted anonymous access component
const AnonymousAccessSection = ({
  loading,
  handleAnonymousAccess,
}: {
  loading: boolean;
  handleAnonymousAccess: () => void;
}) => (
  <div className="mt-6">
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-white text-gray-500">or</span>
      </div>
    </div>

    <button
      type="button"
      onClick={handleAnonymousAccess}
      className={`mt-4 w-full ${
        loading ? "bg-gray-300" : "bg-gray-500 hover:bg-gray-600"
      } text-white rounded-md p-2 transition font-medium`}
      disabled={loading}
    >
      {loading ? (
        // In the Anonymous Access button
        <button
          type="button"
          onClick={handleAnonymousAccess}
          className={`mt-4 w-full ${
            loading ? "bg-gray-300" : "bg-gray-500 hover:bg-gray-600"
          } text-white rounded-md p-2 transition font-medium`}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2" />
              <span>Creating session...</span>
            </span>
          ) : (
            "Continue as Guest"
          )}
        </button>
      ) : (
        "Continue as Guest"
      )}
    </button>

    <p className="mt-2 text-xs text-gray-500 text-center">
      Guest mode: Chat without creating an account. Your chats won't be saved.
    </p>
  </div>
);

// Main component
export default function HomeLayout() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Form fields
  const [formData, setFormData] = useState<FormDataState>({
    username: "",
    fullName: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<any>({});
  const router = useRouter();

  const deviceLogin = useDeviceLogin();
  const deviceRegistration = useDeviceRegistration();
  const anonymousRegistration = useAnonymousDeviceRegistration();

  // Get cookie helper function
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
    return null;
  };

  useEffect(() => {
    const storedDeviceId = getCookie("deviceId");
    if (storedDeviceId) {
      setIsRegistered(true);
      redirect("/chat");
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    let processedValue = value;

    // Special handling for username field
    if (name === "username") {
      // Remove spaces and convert to lowercase
      processedValue = value.replace(/\s/g, "").toLowerCase();
    }

    setFormData((prev: FormDataState) => ({
      ...prev,
      [name]: processedValue,
    }));

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors((prev: any) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Handle username keydown events
  const handleUsernameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent spacebar
    if (e.key === " ") {
      e.preventDefault();
    }
  };

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (!/^[a-z0-9_-]+$/.test(formData.username)) {
      newErrors.username =
        "Username can only contain lowercase letters, numbers, underscores, and hyphens";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters long";
    }

    if (!isLoginMode) {
      if (!formData.fullName.trim()) {
        newErrors.fullName = "Full name is required";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords don't match";
      }
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (!isLoginMode && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLoginMode) {
        // Login
        const result = await deviceLogin.mutateAsync({
          username: formData.username,
          password: formData.password,
        });

        if (result.success) {
          setIsRegistered(true);
          router.push("/chat");
        } else {
          setErrors({ general: "Invalid username or password" });
        }
      } else {
        // Registration
        const result = await deviceRegistration.mutateAsync({
          username: formData.username,
          full_name: formData.fullName,
          password: formData.password,
          confirm_password: formData.confirmPassword,
        });

        if (result.success) {
          setIsRegistered(true);
          router.push("/chat");
        } else {
          setErrors(result.errors ?? { general: "Registration failed" });
        }
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({
          general: error.response?.data?.error ?? "Authentication failed",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousAccess = async () => {
    setLoading(true);
    try {
      await anonymousRegistration.mutateAsync();
      setIsRegistered(true);
      router.push("/chat");
    } catch (error) {
      console.error("Anonymous registration error:", error);
      setErrors({ general: "Failed to create anonymous session" });
    } finally {
      setLoading(false);
    }
  };

  // Render login button text
  const renderLoginButtonText = () => {
    if (loading) {
      return (
        <span className="flex items-center justify-center">
          <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2" />
          {isLoginMode ? "Logging in..." : "Registering..."}
        </span>
      );
    }
    return isLoginMode ? "Login" : "Register";
  };

  // Mode toggle handler
  const toggleMode = (loginMode: boolean) => {
    setIsLoginMode(loginMode);
    setErrors({});
    setFormData({
      username: "",
      fullName: "",
      password: "",
      confirmPassword: "",
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Head>
        <title>Chat App - {isLoginMode ? "Login" : "Register"}</title>
        <meta name="description" content="Device-based chat application" />
      </Head>

      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          Welcome to Chat App
        </h1>

        {isRegistered ? (
          <div>
            <p className="mb-4 text-gray-600">Welcome back!</p>
            <div className="mt-6">
              <Link
                href="/chat"
                className="block w-full bg-green-500 text-white rounded-md p-2 text-center hover:bg-green-600 transition"
              >
                Go to Chat
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Mode Toggle */}
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                  isLoginMode
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => toggleMode(true)}
              >
                Login
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                  !isLoginMode
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => toggleMode(false)}
              >
                Register
              </button>
            </div>

            {/* Error Display */}
            {errors.general && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {errors.general}
              </div>
            )}

            <AuthForm
              isLoginMode={isLoginMode}
              formData={formData}
              errors={errors}
              loading={loading}
              handleInputChange={handleInputChange}
              handleUsernameKeyDown={handleUsernameKeyDown}
              handleSubmit={handleSubmit}
              renderLoginButtonText={renderLoginButtonText}
            />

            <AnonymousAccessSection
              loading={loading}
              handleAnonymousAccess={handleAnonymousAccess}
            />

            {/* Additional Info */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {isLoginMode
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => toggleMode(!isLoginMode)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                  disabled={loading}
                >
                  {isLoginMode ? "Register here" : "Login here"}
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
