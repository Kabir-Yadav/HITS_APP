import { useState, useCallback } from 'react';

import { supabase } from 'src/lib/supabase';

// ----------------------------------------------------------------------

// Valid status values for reference
const APPLICATION_STATUS = {
  PENDING: 'pending',
  SHORTLISTED: 'shortlisted',
  TECHNICAL_PENDING: 'technical_pending',
  ONBOARDING_PENDING: 'onboarding_pending',
  HIRED: 'hired',
  REJECTED: 'rejected',
};

const INTERVIEW_STATUS = {
  SCHEDULED: 'scheduled',
  SHORTLISTED: 'shortlisted',
  REJECTED: 'rejected',
  STANDBY: 'standby',
  COMPLETED: 'completed',
};

const STAGES = {
  TELEPHONE: 'telephone',
  TECHNICAL: 'technical',
  ONBOARDING: 'onboarding',
};

export function useInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const applyFilters = (data, filters) => {
    if (!data || !filters) return data;

    return data.filter((item) => {
      // Job ID filter
      if (filters.jobId && item.application?.job?.id !== filters.jobId) {
        return false;
      }

      // Interviewer filter
      if (filters.interviewer && item.interviewer !== filters.interviewer) {
        return false;
      }

      // Status filter (if not 'all')
      if (filters.status !== 'all' && item.status !== filters.status) {
        return false;
      }

      // Date range filter
      if (filters.startDate && filters.endDate) {
        const itemDate = new Date(item.schedule_date || item.created_at);
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        if (itemDate < startDate || itemDate > endDate) {
          return false;
        }
      }

      return true;
    });
  };

  const fetchInterviews = useCallback(async (stage, filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Special handling for Selected and Rejected sections
      if (stage === 'selected' || stage === 'rejected') {
        const status = stage === 'selected' ? APPLICATION_STATUS.HIRED : APPLICATION_STATUS.REJECTED;
        
        let query = supabase
          .from('applications')
          .select(`
            id,
            applicant_name,
            resume_url,
            created_at,
            status,
            current_stage,
            email,
            job:jobs (
              id,
              job_id,
              title,
              department
            )
          `)
          .eq('status', status);

        // Apply job filter if present
        if (filters.jobId) {
          query = query.eq('job_id', filters.jobId);
        }

        // Apply date range filter if present
        if (filters.startDate && filters.endDate) {
          query = query
            .gte('created_at', filters.startDate)
            .lte('created_at', filters.endDate);
        }

        query = query.order('updated_at', { ascending: false });

        const { data: statusApplications, error: statusError } = await query;

        if (statusError) {
          throw new Error(statusError.message);
        }

        const applicationIds = statusApplications.map(app => app.id);
        
        let interviewsQuery = supabase
          .from('interviews')
          .select(`
            *,
            application:applications (
              id,
              applicant_name,
              resume_url,
              created_at,
              status,
              current_stage,
              email,
              job:jobs (
                id,
                job_id,
                title,
                department
              )
            )
          `)
          .in('application_id', applicationIds);

        // Apply interviewer filter if present
        if (filters.interviewer) {
          interviewsQuery = interviewsQuery.eq('interviewer', filters.interviewer);
        }

        interviewsQuery = interviewsQuery.order('created_at', { ascending: true });

        const { data: allInterviews, error: interviewsError } = await interviewsQuery;

        if (interviewsError) {
          throw new Error(interviewsError.message);
        }

        // Group all interviews by application to create history
        const interviewsByApplication = allInterviews.reduce((acc, interview) => {
          if (!acc[interview.application_id]) {
            acc[interview.application_id] = {
              ...interview,
              interview_history: []
            };
          }
          acc[interview.application_id].interview_history.push(interview);
          return acc;
        }, {});

        // Sort interview history by created_at
        Object.values(interviewsByApplication).forEach(app => {
          app.interview_history.sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          );
        });

        setInterviews(Object.values(interviewsByApplication));
        setApplications([]);
        return;
      }

      // Regular interview stage handling
      let applicationsQuery = supabase
        .from('applications')
        .select(`
          id,
          applicant_name,
          resume_url,
          created_at,
          status,
          current_stage,
          email,
          job:jobs (
            id,
            job_id,
            title,
            department
          )
        `);

      // Apply job filter if present
      if (filters.jobId) {
        applicationsQuery = applicationsQuery.eq('job_id', filters.jobId);
      }

      const { data: allApplications, error: applicationsError } = await applicationsQuery;

      if (applicationsError) {
        throw new Error(applicationsError.message);
      }

      // Fetch all interviews for the current stage
      let interviewsQuery = supabase
        .from('interviews')
        .select(`
          *,
          application:applications (
            id,
            applicant_name,
            resume_url,
            created_at,
            status,
            current_stage,
            email,
            job:jobs (
              id,
              job_id,
              title,
              department
            )
          )
        `)
        .eq('stage', stage);

      // Apply interviewer filter if present
      if (filters.interviewer) {
        interviewsQuery = interviewsQuery.eq('interviewer', filters.interviewer);
      }

      // Apply date range filter if present
      if (filters.startDate && filters.endDate) {
        interviewsQuery = interviewsQuery
          .gte('schedule_date', filters.startDate)
          .lte('schedule_date', filters.endDate);
      }

      // Apply status filter if not 'all'
      if (filters.status !== 'all') {
        interviewsQuery = interviewsQuery.eq('status', filters.status);
      }

      interviewsQuery = interviewsQuery.order('schedule_date', { ascending: true });

      const { data: interviewsData, error: interviewsError } = await interviewsQuery;

      if (interviewsError) {
        throw new Error(interviewsError.message);
      }

      // Get IDs of applications that have scheduled interviews in this stage
      const scheduledApplicationIds = (interviewsData || [])
        .filter(interview => interview.status === INTERVIEW_STATUS.SCHEDULED)
        .map(interview => interview.application_id)
        .filter(Boolean);

      // Filter eligible applications based on stage and status
      let eligibleApplications = [];
      switch (stage) {
        case STAGES.TELEPHONE:
          eligibleApplications = allApplications.filter(
            app => (app.status === APPLICATION_STATUS.SHORTLISTED && !scheduledApplicationIds.includes(app.id)) ||
                  (app.current_stage === STAGES.TELEPHONE && app.status === APPLICATION_STATUS.SHORTLISTED)
          );
          break;

        case STAGES.TECHNICAL:
          eligibleApplications = allApplications.filter(
            app => ((app.status === APPLICATION_STATUS.TECHNICAL_PENDING || 
                   (app.status === APPLICATION_STATUS.SHORTLISTED && app.current_stage === STAGES.TECHNICAL)) && 
                   !scheduledApplicationIds.includes(app.id)) ||
                   (app.current_stage === STAGES.TECHNICAL && app.status === APPLICATION_STATUS.TECHNICAL_PENDING)
          );
          break;

        case STAGES.ONBOARDING:
          eligibleApplications = allApplications.filter(
            app => (app.status === APPLICATION_STATUS.ONBOARDING_PENDING && !scheduledApplicationIds.includes(app.id)) ||
                  (app.current_stage === STAGES.ONBOARDING && app.status === APPLICATION_STATUS.ONBOARDING_PENDING)
          );
          break;

        default:
          eligibleApplications = [];
          break;
      }

      // Filter out interviews that don't have valid applications
      const validInterviews = interviewsData?.filter(interview => interview.application) || [];

      // Apply job filter to eligible applications if present
      if (filters.jobId) {
        eligibleApplications = eligibleApplications.filter(app => app.job?.id === filters.jobId);
      }

      setInterviews(validInterviews);
      setApplications(eligibleApplications);
    } catch (err) {
      console.error('Error fetching interviews:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleInterview = useCallback(async ({ applicationIds, stage, scheduleDate, interviewer, assignedBy }) => {
    try {
      setLoading(true);
      setError(null);

      // Create interview records
      const { error: insertError } = await supabase
        .from('interviews')
        .insert(
          applicationIds.map((applicationId) => ({
            application_id: applicationId,
            stage,
            status: INTERVIEW_STATUS.SCHEDULED,
            schedule_date: scheduleDate,
            interviewer,
            assigned_by: assignedBy,
          }))
        );

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Update application current_stage
      const { error: updateError } = await supabase
        .from('applications')
        .update({ current_stage: stage })
        .in('id', applicationIds);

      if (updateError) {
        // If update fails, clean up the created interviews
        await supabase
          .from('interviews')
          .delete()
          .in('application_id', applicationIds);
        throw new Error(updateError.message);
      }

      // Refresh interviews list
      await fetchInterviews(stage);
    } catch (err) {
      console.error('Error scheduling interview:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchInterviews]);

  const updateInterviewStatus = useCallback(async ({ applicationIds, status, feedback }) => {
    try {
      setLoading(true);
      setError(null);

      // Get the most recent interview for each application in the current stage
      const { data: stageInterviews, error: stageError } = await supabase
        .from('interviews')
        .select('stage, application_id')
        .in('application_id', applicationIds)
        .order('created_at', { ascending: false });

      if (stageError) {
        throw new Error(stageError.message);
      }

      // Group interviews by application to get the latest stage for each
      const latestInterviews = stageInterviews.reduce((acc, interview) => {
        if (!acc[interview.application_id]) {
          acc[interview.application_id] = interview;
        }
        return acc;
      }, {});

      // Get unique stages - should be only one if all selected applications are in the same stage
      const uniqueStages = [...new Set(Object.values(latestInterviews).map(int => int.stage))];
      
      if (uniqueStages.length !== 1) {
        throw new Error('Selected applications must be in the same interview stage');
      }

      const currentStage = uniqueStages[0];

      // Prepare the update data for interviews
      const interviewUpdateData = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Only include feedback for standby status in onboarding stage, or for other stages
      if (currentStage !== STAGES.ONBOARDING || status === INTERVIEW_STATUS.STANDBY) {
        interviewUpdateData.feedback = feedback;
      }

      const { error: updateError } = await supabase
        .from('interviews')
        .update(interviewUpdateData)
        .in('application_id', applicationIds)
        .eq('stage', currentStage);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Determine the new application status based on interview status
      let applicationStatus;
      let nextStage;

      switch (currentStage) {
        case STAGES.TELEPHONE:
          if (status === INTERVIEW_STATUS.SHORTLISTED) {
            applicationStatus = APPLICATION_STATUS.TECHNICAL_PENDING;
            nextStage = STAGES.TECHNICAL;
          } else if (status === INTERVIEW_STATUS.REJECTED) {
            applicationStatus = APPLICATION_STATUS.REJECTED;
          } else if (status === INTERVIEW_STATUS.STANDBY) {
            applicationStatus = APPLICATION_STATUS.SHORTLISTED;
          }
          break;

        case STAGES.TECHNICAL:
          if (status === INTERVIEW_STATUS.SHORTLISTED) {
            applicationStatus = APPLICATION_STATUS.ONBOARDING_PENDING;
            nextStage = STAGES.ONBOARDING;
          } else if (status === INTERVIEW_STATUS.REJECTED) {
            applicationStatus = APPLICATION_STATUS.REJECTED;
          } else if (status === INTERVIEW_STATUS.STANDBY) {
            applicationStatus = APPLICATION_STATUS.TECHNICAL_PENDING;
          }
          break;

        case STAGES.ONBOARDING:
          if (status === INTERVIEW_STATUS.COMPLETED) {
            applicationStatus = APPLICATION_STATUS.HIRED;
          } else if (status === INTERVIEW_STATUS.REJECTED) {
            applicationStatus = APPLICATION_STATUS.REJECTED;
          } else if (status === INTERVIEW_STATUS.STANDBY) {
            applicationStatus = APPLICATION_STATUS.ONBOARDING_PENDING;
          }
          break;

        default:
          applicationStatus = null;
          nextStage = null;
          break;
      }

      // Update application status and stage if we have a new status
      if (applicationStatus) {
        const applicationUpdateData = { status: applicationStatus };
        if (nextStage) {
          applicationUpdateData.current_stage = nextStage;
        }

        const { error: appUpdateError } = await supabase
          .from('applications')
          .update(applicationUpdateData)
          .in('id', applicationIds);

        if (appUpdateError) {
          throw new Error(appUpdateError.message);
        }
      }

      // Refresh interviews list
      await fetchInterviews(currentStage);
    } catch (err) {
      console.error('Error updating interview status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchInterviews]);

  return {
    interviews,
    applications,
    loading,
    error,
    fetchInterviews,
    scheduleInterview,
    updateInterviewStatus,
  };
} 