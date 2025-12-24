"""Tests for MS Teams meeting URL and ID parser."""

from app.services.teams_parser import parse_teams_meeting


class TestParseTeamsMeeting:
    """Test suite for MS Teams URL parser."""

    def test_parse_old_url_format(self):
        """Test parsing old Teams URL format with encoded thread ID."""
        url = "https://teams.microsoft.com/meetup-join/19%3ameeting_abc123def456%40thread.v2/1234567890"
        result = parse_teams_meeting(url)

        assert result["thread_id"] == "19:meeting_abc123def456@thread.v2"
        assert result["meeting_id"] is None
        assert result["raw_url"] == url

    def test_parse_old_url_format_complex(self):
        """Test parsing old URL with complex encoded characters."""
        url = "https://teams.microsoft.com/l/meetup-join/19%3ameeting_NzY5YzYzZTctYjI1Zi00ZjE5LWI4N2UtMjk4ZjE5YzQxNmI5%40thread.v2/0?context=%7b%22Tid%22%3a%2212345%22%7d"
        result = parse_teams_meeting(url)

        assert result["thread_id"] is not None
        assert "19:meeting_" in result["thread_id"]
        assert "@thread.v2" in result["thread_id"]
        assert result["raw_url"] == url

    def test_parse_new_url_format(self):
        """Test parsing new simplified Teams URL format."""
        url = "https://teams.microsoft.com/meet/abc123def456?p=xyzHashedPasscode"
        result = parse_teams_meeting(url)

        assert result["thread_id"] is None
        assert result["meeting_id"] == "abc123def456"
        assert result["raw_url"] == url

    def test_parse_new_url_format_no_query(self):
        """Test parsing new URL without query parameters."""
        url = "https://teams.microsoft.com/meet/abc123def456"
        result = parse_teams_meeting(url)

        assert result["thread_id"] is None
        assert result["meeting_id"] == "abc123def456"
        assert result["raw_url"] == url

    def test_parse_numeric_meeting_id_with_spaces(self):
        """Test parsing numeric meeting ID with spaces."""
        meeting_id = "385 562 023 120 47"
        result = parse_teams_meeting(meeting_id)

        assert result["thread_id"] is None
        assert result["meeting_id"] == "38556202312047"  # spaces removed
        assert result["raw_url"] is None

    def test_parse_numeric_meeting_id_no_spaces(self):
        """Test parsing numeric meeting ID without spaces."""
        meeting_id = "38556202312047"
        result = parse_teams_meeting(meeting_id)

        assert result["thread_id"] is None
        assert result["meeting_id"] == "38556202312047"
        assert result["raw_url"] is None

    def test_parse_empty_string(self):
        """Test parsing empty string returns None for all fields."""
        result = parse_teams_meeting("")

        assert result["thread_id"] is None
        assert result["meeting_id"] is None
        assert result["raw_url"] is None

    def test_parse_none_input(self):
        """Test parsing None input returns None for all fields."""
        result = parse_teams_meeting(None)

        assert result["thread_id"] is None
        assert result["meeting_id"] is None
        assert result["raw_url"] is None

    def test_parse_whitespace_only(self):
        """Test parsing whitespace-only string."""
        result = parse_teams_meeting("   ")

        assert result["thread_id"] is None
        assert result["meeting_id"] is None
        assert result["raw_url"] is None

    def test_parse_invalid_url(self):
        """Test parsing invalid/unrecognized URL format."""
        url = "https://example.com/not-a-teams-link"
        result = parse_teams_meeting(url)

        assert result["thread_id"] is None
        assert result["meeting_id"] is None
        assert result["raw_url"] == url

    def test_parse_malformed_url(self):
        """Test parsing malformed URL."""
        url = "not-a-url-at-all"
        result = parse_teams_meeting(url)

        assert result["thread_id"] is None
        assert result["meeting_id"] is None
        assert result["raw_url"] == url

    def test_url_decoding_colons_and_at_signs(self):
        """Test that URL decoding works correctly for special characters."""
        url = "https://teams.microsoft.com/meetup-join/19%3ameeting_test%40thread.v2/0"
        result = parse_teams_meeting(url)

        # %3a should decode to :
        # %40 should decode to @
        assert result["thread_id"] is not None
        thread_id = result["thread_id"]
        assert ":" in thread_id
        assert "@" in thread_id
        assert "%3a" not in thread_id.lower()
        assert "%40" not in thread_id.lower()

    def test_numeric_id_with_leading_trailing_spaces(self):
        """Test that numeric IDs are trimmed before processing."""
        # Leading/trailing spaces should be trimmed and ID extracted
        result = parse_teams_meeting(" 123 456 789")
        assert result["meeting_id"] == "123456789"

        result = parse_teams_meeting("123 456 789 ")
        assert result["meeting_id"] == "123456789"

        result = parse_teams_meeting("  123 456 789  ")
        assert result["meeting_id"] == "123456789"

    def test_single_digit_not_treated_as_meeting_id(self):
        """Test that a single digit is not treated as a meeting ID."""
        result = parse_teams_meeting("5")

        # Single digit doesn't match pattern ^\d[\d\s]+\d$
        assert result["meeting_id"] is None
        assert result["raw_url"] == "5"

    def test_preserves_case_in_meeting_ids(self):
        """Test that case is preserved in extracted meeting IDs."""
        url = "https://teams.microsoft.com/meet/AbC123DeF456"
        result = parse_teams_meeting(url)

        assert result["meeting_id"] == "AbC123DeF456"
