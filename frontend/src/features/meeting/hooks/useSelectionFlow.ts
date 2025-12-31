import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getCities,
  getMeetingRooms,
  visit,
  createCity,
  createMeetingRoom,
} from "../api/client";
import { mapVisitResponse } from "../domain/mappers";
import type { CityDto, MeetingRoomDto } from "../types/dto";
import type { VisitSession } from "../types/domain";

type State = {
  cities: CityDto[];
  rooms: MeetingRoomDto[];
  cityInput: string;
  roomInput: string;
  selectedCityId: string | null;
  msTeamsInput: string | null;
  session: VisitSession | null;
  loadingCities: boolean;
  loadingRooms: boolean;
  submitting: boolean;
  error: string | null;
};

type PersistedInputs = {
  cityInput: string;
  roomInput: string;
  msTeamsInput: string | null;
};

const STORAGE_KEY = "meeting-selection-inputs";

const initialState: State = {
  cities: [],
  rooms: [],
  cityInput: "",
  roomInput: "",
  selectedCityId: null,
  msTeamsInput: null,
  session: null,
  loadingCities: false,
  loadingRooms: false,
  submitting: false,
  error: null,
};

function saveInputsToSession(inputs: PersistedInputs) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
  } catch (err) {
    // Silently fail if sessionStorage is unavailable
    console.warn("Failed to save selection to sessionStorage:", err);
  }
}

function loadInputsFromSession(): PersistedInputs | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    console.warn("Failed to load selection from sessionStorage:", err);
    return null;
  }
}

export function useSelectionFlow() {
  const [state, setState] = useState<State>(() => {
    const persisted = loadInputsFromSession();
    if (persisted) {
      return {
        ...initialState,
        cityInput: persisted.cityInput,
        roomInput: persisted.roomInput,
        msTeamsInput: persisted.msTeamsInput,
      };
    }
    return initialState;
  });

  const fetchCities = useCallback(async () => {
    setState((prev) => ({ ...prev, loadingCities: true, error: null }));
    try {
      const cities = await getCities();
      setState((prev) => ({ ...prev, cities }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Unable to load cities",
      }));
    } finally {
      setState((prev) => ({ ...prev, loadingCities: false }));
    }
  }, []);

  const fetchRooms = useCallback(async (cityId: string) => {
    setState((prev) => ({ ...prev, loadingRooms: true }));
    try {
      const rooms = await getMeetingRooms(cityId);
      setState((prev) => ({ ...prev, rooms }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Unable to load rooms",
      }));
    } finally {
      setState((prev) => ({ ...prev, loadingRooms: false }));
    }
  }, []);

  useEffect(() => {
    void fetchCities();
  }, [fetchCities]);

  // Persist inputs to sessionStorage whenever they change
  useEffect(() => {
    saveInputsToSession({
      cityInput: state.cityInput,
      roomInput: state.roomInput,
      msTeamsInput: state.msTeamsInput,
    });
  }, [state.cityInput, state.roomInput, state.msTeamsInput]);

  const findCityByName = useCallback(
    (name: string) => {
      const trimmed = name.trim().toLowerCase();
      return (
        state.cities.find((c) => c.name.trim().toLowerCase() === trimmed) ??
        null
      );
    },
    [state.cities]
  );

  // Watch cityInput and fetch rooms when a valid city is matched
  useEffect(() => {
    const matchedCity = findCityByName(state.cityInput);
    if (matchedCity && matchedCity.id !== state.selectedCityId) {
      setState((prev) => ({ ...prev, selectedCityId: matchedCity.id }));
      void fetchRooms(matchedCity.id);
    } else if (!matchedCity && state.selectedCityId) {
      setState((prev) => ({
        ...prev,
        selectedCityId: null,
        rooms: [],
        roomInput: "",
      }));
    }
  }, [
    state.cityInput,
    state.cities,
    state.selectedCityId,
    fetchRooms,
    findCityByName,
  ]);

  const setCityInput = useCallback((value: string) => {
    setState((prev) => ({ ...prev, cityInput: value }));
  }, []);

  const setRoomInput = useCallback((value: string) => {
    setState((prev) => ({ ...prev, roomInput: value }));
  }, []);

  const setMsTeamsInput = useCallback((value: string | null) => {
    setState((prev) => ({ ...prev, msTeamsInput: value ?? "" }));
  }, []);

  const submit = useCallback(async (): Promise<VisitSession> => {
    setState((prev) => ({ ...prev, submitting: true, error: null }));
    try {
      let cityIdToUse: string | undefined;
      let roomIdToUse: string | undefined;

      // Resolve or create city
      if (state.cityInput.trim()) {
        const existingCity = findCityByName(state.cityInput);
        if (existingCity) {
          cityIdToUse = existingCity.id;
        } else {
          const created = await createCity(state.cityInput.trim());
          cityIdToUse = created.id;
          // refresh city list for future use
          setState((prev) => ({ ...prev, cities: [...prev.cities, created] }));
        }
      }

      // Resolve or create room (requires city)
      if (state.roomInput.trim() && cityIdToUse) {
        // ensure rooms for that city are loaded
        const rooms =
          state.rooms.length > 0 && state.selectedCityId === cityIdToUse
            ? state.rooms
            : await getMeetingRooms(cityIdToUse);
        setState((prev) => ({ ...prev, rooms }));
        const existingRoom =
          rooms.find(
            (r) =>
              r.name.trim().toLowerCase() ===
              state.roomInput.trim().toLowerCase()
          ) ?? null;
        if (existingRoom) {
          roomIdToUse = existingRoom.id;
        } else {
          const createdRoom = await createMeetingRoom({
            name: state.roomInput.trim(),
            cityId: cityIdToUse,
          });
          roomIdToUse = createdRoom.id;
          setState((prev) => ({
            ...prev,
            rooms: [...prev.rooms, createdRoom],
          }));
        }
      }

      // Visit endpoint now only returns meeting info (no participant creation)
      // Participant creation happens via WebSocket join
      const response = await visit({
        cityId: cityIdToUse,
        meetingRoomId: roomIdToUse,
        msTeamsInput: state.msTeamsInput || undefined,
      });
      const session: VisitSession = {
        ...mapVisitResponse(response),
        cityName: state.cityInput.trim() || null,
        meetingRoomName: state.roomInput.trim() || null,
        msTeamsInput: state.msTeamsInput || null,
      };
      setState((prev) => ({ ...prev, session }));
      return session;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to start meeting";
      setState((prev) => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, submitting: false }));
    }
  }, [
    state.cityInput,
    state.roomInput,
    state.msTeamsInput,
    state.rooms,
    state.selectedCityId,
    findCityByName,
  ]);

  const combinedLoading = useMemo(
    () => state.loadingCities || state.loadingRooms || state.submitting,
    [state.loadingCities, state.loadingRooms, state.submitting]
  );

  return {
    ...state,
    loading: combinedLoading,
    setCityInput,
    setRoomInput,
    setMsTeamsInput,
    submit,
  };
}
