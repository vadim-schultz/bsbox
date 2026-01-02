"""Base protocol for smoothing strategies."""

from typing import Protocol


class SmoothingStrategy(Protocol):
    """Protocol for smoothing algorithms."""

    def smooth(self, flags: list[int], window: int) -> list[float]:
        """Apply smoothing algorithm to binary engagement flags.

        Args:
            flags: List of binary engagement values (0 or 1)
            window: Window size in minutes for smoothing

        Returns:
            List of smoothed engagement percentages (0-100)
        """
        ...
