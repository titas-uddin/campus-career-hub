import { useQuery, useQueryClient } from "@tanstack/react-query";
import { applications, matchExplanations, opportunities, stageEvents, studentProfiles } from "./models";

const LIVE_MS = 5_000;

export function useInvalidateAll() {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}

export function useOpportunities(filter?: Record<string, unknown>) {
  return useQuery({ queryKey: ["opportunities", filter ?? {}], queryFn: () => opportunities.listAll(filter) });
}

export function useOpportunity(id?: string) {
  return useQuery({ enabled: Boolean(id), queryKey: ["opportunity", id], queryFn: () => opportunities.get(id as string) });
}

export function useApplications(filter?: Record<string, unknown>, live = false) {
  return useQuery({
    queryKey: ["applications", filter ?? {}],
    queryFn: () => applications.listAll(filter),
    refetchInterval: live ? LIVE_MS : false
  });
}

export function useApplication(id?: string, live = false) {
  return useQuery({ enabled: Boolean(id), queryKey: ["application", id], queryFn: () => applications.get(id as string), refetchInterval: live ? LIVE_MS : false });
}

export function useStageEvents(applicationId?: string, live = false) {
  return useQuery({
    enabled: Boolean(applicationId),
    queryKey: ["stageEvents", applicationId],
    queryFn: async () => {
      const events = await stageEvents.listAll({ ApplicationId: applicationId });
      return events.sort((a, b) => new Date(a.ChangedAt).getTime() - new Date(b.ChangedAt).getTime());
    },
    refetchInterval: live ? LIVE_MS : false
  });
}

export function useExplanation(applicationId?: string) {
  return useQuery({
    enabled: Boolean(applicationId),
    queryKey: ["explanation", applicationId],
    queryFn: async () => (await matchExplanations.listAll({ ApplicationId: applicationId }))[0]
  });
}

export function useExplanations(filter?: Record<string, unknown>) {
  return useQuery({ queryKey: ["explanations", filter ?? {}], queryFn: () => matchExplanations.listAll(filter) });
}

export function useStudentProfile(userId?: string) {
  return useQuery({
    enabled: Boolean(userId),
    queryKey: ["studentProfile", userId],
    queryFn: async () => (await studentProfiles.listAll({ UserId: userId }))[0]
  });
}
