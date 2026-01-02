"""No smoothing strategy - returns instant binary values."""


class NoSmoothingStrategy:
    """Returns instant binary values (0% or 100%)."""

    def smooth(self, flags: list[int], window: int) -> list[float]:
        """Convert binary flags to percentages without smoothing.

        Returns current engagement status (0% or 100%) for real-time tracking.
        The window parameter is kept for API compatibility but not used.

        Args:
            flags: List of binary engagement values (0 or 1)
            window: Window size in minutes (unused)

        Returns:
            List of engagement percentages (0 or 100)
        """
        return [flag * 100.0 for flag in flags]
