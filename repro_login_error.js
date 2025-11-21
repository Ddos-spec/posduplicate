
class AxiosError extends Error {
    constructor(message, response) {
        super(message);
        this.isAxiosError = true;
        this.response = response;
    }
}

const axios = {
    isAxiosError: (err) => err && err.isAxiosError
};

// authStore logic
async function login(fail) {
    try {
        if (fail) {
            // Simulate API error
            throw new AxiosError("Request failed", {
                data: { error: { message: "Specific Backend Error" } }
            });
        }
    } catch (error) {
        // authStore catches and rethrows Error
        let errorMessage = 'Login failed';
        if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
        }
        throw new Error(errorMessage);
    }
}

// LoginPage logic
async function handleSubmit() {
    try {
        console.log("Attempting login...");
        await login(true);
    } catch (error) {
        console.log("Caught error in LoginPage:", error);
        let errorMessage = 'Login failed';

        // This is the buggy line in LoginPage.tsx
        // Since error is now a generic Error (not AxiosError), this check fails
        if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
        }

        console.log("Displayed message:", errorMessage);

        if (errorMessage === "Specific Backend Error") {
            console.log("FAILURE: Error message propagated correctly (unexpected)");
        } else {
            console.log("SUCCESS: Error message lost (reproduction confirmed)");
        }
    }
}

handleSubmit();
