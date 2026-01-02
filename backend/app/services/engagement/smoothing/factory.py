"""Factory for creating smoothing strategies."""

from enum import Enum

from app.services.engagement.smoothing.base import SmoothingStrategy
from app.services.engagement.smoothing.kalman import KalmanSmoothingStrategy
from app.services.engagement.smoothing.no_smoothing import NoSmoothingStrategy


class SmoothingAlgorithm(str, Enum):
    """Available smoothing algorithms."""

    NONE = "none"
    KALMAN = "kalman"


class SmoothingFactory:
    """Factory for creating smoothing strategies."""

    @staticmethod
    def create(algorithm: SmoothingAlgorithm = SmoothingAlgorithm.KALMAN) -> SmoothingStrategy:
        """Create a smoothing strategy instance.

        Args:
            algorithm: The smoothing algorithm to use (defaults to Kalman)

        Returns:
            A smoothing strategy instance

        Raises:
            ValueError: If the algorithm is not supported
        """
        if algorithm == SmoothingAlgorithm.NONE:
            return NoSmoothingStrategy()
        if algorithm == SmoothingAlgorithm.KALMAN:
            return KalmanSmoothingStrategy()
        raise ValueError(f"Unknown smoothing algorithm: {algorithm}")
