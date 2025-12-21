import { Box, Button, Stack, Text } from "@chakra-ui/react";

import { CitySelector, MeetingRoomSelector, MSTeamsInput } from "../components/selection";
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
    (!cityInput && !msTeamsInput);

  return (
    <Stack gap={4}>
      <Text fontSize="lg" fontWeight="semibold">
        Configure Your Meeting
      </Text>
      
      {error ? (
        <Box bg="red.50" border="1px solid" borderColor="red.200" px={3} py={2} rounded="md">
          <Text color="red.700" fontSize="sm" fontWeight="medium">
            Error: {error}
          </Text>
          <Text color="red.600" fontSize="xs" mt={1}>
            Please try again or contact support if the problem persists.
          </Text>
        </Box>
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
        disabled={!cityInput}
      />

      <MSTeamsInput value={msTeamsInput} onChange={setMsTeamsInput} />

      {isContinueDisabled && !loading && (
        <Text color="orange.600" fontSize="sm">
          Please select a city or enter a Teams meeting link to continue.
        </Text>
      )}

      <Button onClick={handleSubmit} isLoading={loading} isDisabled={isContinueDisabled} size="lg">
        {loading ? "Starting meeting..." : "Continue to meeting"}
      </Button>
    </Stack>
  );
}
