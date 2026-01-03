import { Alert, Button, Stack, Text } from "@chakra-ui/react";
import { useMemo, useState } from "react";

import { CitySelector } from "../components/Selection/CitySelector";
import { MeetingRoomSelector } from "../components/Selection/MeetingRoomSelector";
import { MSTeamsInput } from "../components/Selection/MSTeamsInput";
import { DurationControl } from "../components/Selection/DurationControl";
import { useSelectionFlow } from "../hooks/useSelectionFlow";
import type { VisitSession } from "../types/domain";

type Props = {
  onSessionReady: (session: VisitSession) => void;
};

export function SelectionContainer({ onSessionReady }: Props) {
  const {
    cities,
    rooms,
    cityInput,
    roomInput,
    msTeamsInput,
    loading,
    loadingCities,
    loadingRooms,
    error,
    submit,
    setCityInput,
    setRoomInput,
    setMsTeamsInput,
  } = useSelectionFlow();

  const [durationInput, setDurationInput] = useState<30 | 60>(60);

  const handleSubmit = async () => {
    if (loading) return;
    try {
      const session = await submit(durationInput);
      onSessionReady(session);
    } catch {
      // errors are handled in hook state
    }
  };

  // Check if Teams link is provided and valid
  const hasValidTeamsInput = useMemo(() => {
    if (!msTeamsInput?.trim()) return false;
    const trimmed = msTeamsInput.trim();
    // Basic validation - check for URL or numeric pattern
    if (trimmed.toLowerCase().startsWith("http")) {
      return trimmed.includes("teams.microsoft.com");
    }
    const numericPattern = /^\d[\d\s]+\d$/;
    return numericPattern.test(trimmed);
  }, [msTeamsInput]);

  // Disable city/room when Teams is provided
  const isLocationDisabled = hasValidTeamsInput;

  const isContinueDisabled =
    loading ||
    (!hasValidTeamsInput && !roomInput.trim());

  return (
    <Stack gap={4}>
      <Text fontSize="lg" fontWeight="semibold">
        Configure Your Meeting
      </Text>
      
      {error ? (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Error</Alert.Title>
            <Alert.Description>
              {error}. Please try again or contact support if the problem persists.
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ) : null}

      {/* Teams input first - primary identifier */}
      <MSTeamsInput value={msTeamsInput} onChange={setMsTeamsInput} />

      {/* Show notice when Teams is provided */}
      {hasValidTeamsInput && (
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              This Teams meeting uniquely identifies your session. Location details are optional.
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {/* City and Room selectors - secondary, disabled when Teams provided */}
      <CitySelector
        cities={cities}
        value={cityInput}
        onChange={setCityInput}
        loading={loadingCities}
        disabled={isLocationDisabled}
      />

      <MeetingRoomSelector
        rooms={rooms}
        value={roomInput}
        onChange={setRoomInput}
        loading={loadingRooms}
        disabled={isLocationDisabled || !cityInput.trim()}
        teamsProvided={isLocationDisabled}
      />

      <DurationControl value={durationInput} onChange={setDurationInput} />

      {isContinueDisabled && !loading && (
        <Text color="warning" fontSize="sm">
          Please enter a Teams meeting link/ID or select a city and room to continue.
        </Text>
      )}

      <Button onClick={handleSubmit} loading={loading} disabled={isContinueDisabled} size="lg">
        {loading ? "Starting meeting..." : "Continue to meeting"}
      </Button>
    </Stack>
  );
}
