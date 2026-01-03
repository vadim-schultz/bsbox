import { Alert, Button, Stack, Text } from "@chakra-ui/react";

import { CitySelector } from "../components/Selection/CitySelector";
import { MeetingRoomSelector } from "../components/Selection/MeetingRoomSelector";
import { MSTeamsInput } from "../components/Selection/MSTeamsInput";
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

  const handleSubmit = async () => {
    if (loading) return;
    try {
      const session = await submit();
      onSessionReady(session);
    } catch {
      // errors are handled in hook state
    }
  };

  const isContinueDisabled =
    loading ||
    (!cityInput.trim() && !msTeamsInput?.trim());

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

      <CitySelector
        cities={cities}
        value={cityInput}
        onChange={setCityInput}
        loading={loadingCities}
      />

      <MeetingRoomSelector
        rooms={rooms}
        value={roomInput}
        onChange={setRoomInput}
        loading={loadingRooms}
        disabled={!cityInput.trim()}
      />

      <MSTeamsInput value={msTeamsInput} onChange={setMsTeamsInput} />

      {isContinueDisabled && !loading && (
        <Text color="warning" fontSize="sm">
          Please select a city or enter a Teams meeting link to continue.
        </Text>
      )}

      <Button onClick={handleSubmit} isLoading={loading} isDisabled={isContinueDisabled} size="lg">
        {loading ? "Starting meeting..." : "Continue to meeting"}
      </Button>
    </Stack>
  );
}
