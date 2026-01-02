"""Kalman filter smoothing strategy for engagement data."""


class KalmanSmoothingStrategy:
    """Applies Kalman filter for optimal smoothing with quick response.

    The Kalman filter provides an optimal balance between smoothness and
    responsiveness by adapting to the measurement noise and process dynamics.
    """

    def __init__(self, process_variance: float = 1e-5, measurement_variance: float = 1e-2) -> None:
        """Initialize Kalman filter with variance parameters.

        Args:
            process_variance: Expected variance in the process (how much the
                true state changes between measurements). Lower values = smoother.
            measurement_variance: Expected variance in measurements (noise).
                Lower values = more trust in measurements.
        """
        self.process_variance = process_variance
        self.measurement_variance = measurement_variance

    def smooth(self, flags: list[int], window: int) -> list[float]:
        """Apply 1D Kalman filter to engagement flags.

        Args:
            flags: List of binary engagement values (0 or 1)
            window: Window size in minutes (unused by Kalman filter)

        Returns:
            List of smoothed engagement percentages (0-100)
        """
        if not flags:
            return []

        # Initialize Kalman filter state
        estimates = []
        estimate = flags[0] * 100.0
        error_estimate = 1.0

        for flag in flags:
            measurement = flag * 100.0

            # Prediction step: predict current state
            # (For this simple case, we assume no state transition model)
            error_estimate += self.process_variance

            # Update step: incorporate measurement
            kalman_gain = error_estimate / (error_estimate + self.measurement_variance)
            estimate = estimate + kalman_gain * (measurement - estimate)
            error_estimate = (1 - kalman_gain) * error_estimate

            estimates.append(estimate)

        return estimates
