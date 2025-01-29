import { useState, useCallback, useEffect } from 'react';

import { supabase } from 'src/lib/supabase';

export function useDashboardStats(filters = {}) {
  const [loading, setLoading] = useState(true);
  const [errorState, setError] = useState(null);
  const [stats, setStats] = useState({
    totalApplications: 0,
    totalShortlisted: 0,
    totalRejected: 0,
    totalPending: 0,
    totalJobs: 0,
    totalPositions: 0,
    jobStats: [],
    upcomingInterviews: [],
    jobs: [], // for filters
    pipelineStats: {
      total: 0,
      inProgress: 0,
      shortlisted: 0,
      rejected: 0,
      standby: 0,
      telephonic: 0,
      technical: 0,
      onboarding: 0,
    },
  });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user's email and role
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;
      const userRole = user?.user_metadata?.role;

      if (!userEmail) {
        throw new Error('User not authenticated');
      }

      // Fetch all jobs with positions for filters
      let jobsQuery = supabase
        .from('jobs')
        .select('id, title, positions, is_active, posted_by_name')
        .eq('is_active', true);  // Only count active jobs

      // Apply HR filter if present
      if (filters.postedBy) {
        jobsQuery = jobsQuery.eq('posted_by_name', filters.postedBy);
      }

      // Apply date filters for jobs
      if (filters.postingStartDate) {
        jobsQuery = jobsQuery.gte('created_at', filters.postingStartDate.toISOString());
      }
      if (filters.postingEndDate) {
        jobsQuery = jobsQuery.lte('created_at', filters.postingEndDate.toISOString());
      }
      if (filters.lastDateStartDate) {
        jobsQuery = jobsQuery.gte('last_date', filters.lastDateStartDate.toISOString());
      }
      if (filters.lastDateEndDate) {
        jobsQuery = jobsQuery.lte('last_date', filters.lastDateEndDate.toISOString());
      }

      // Apply email filter only for HR role
      if (userRole !== 'ADMIN') {
        jobsQuery = jobsQuery.eq('posted_by_email', userEmail);
      }

      const { data: jobsData, error: jobsError } = await jobsQuery;

      if (jobsError) throw jobsError;

      // Get job IDs for current user (all jobs for admin, only user's jobs for HR)
      const jobIds = jobsData.map(job => job.id);

      // Fetch applications statistics with filters
      let applicationsQuery = supabase
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          job:jobs (
            id,
            title,
            positions,
            is_active,
            posted_by_name
          )
        `);

      // Filter by job IDs only if there are jobs to filter by
      if (jobIds.length > 0) {
        applicationsQuery = applicationsQuery.in('job_id', jobIds);
      }

      // Apply job filter if present
      if (filters.jobId) {
        applicationsQuery = applicationsQuery.eq('job_id', filters.jobId);
      }

      // Apply date filter if present
      if (filters.startDate && filters.endDate) {
        applicationsQuery = applicationsQuery
          .gte('created_at', filters.startDate)
          .lte('created_at', filters.endDate);
      }

      const { data: applications, error: applicationsError } = await applicationsQuery;

      if (applicationsError) throw applicationsError;

      // Filter applications based on HR filter if present
      const filteredApplications = filters.postedBy 
        ? applications.filter(app => app.job?.posted_by_name === filters.postedBy)
        : applications;

      // Calculate statistics based on filtered applications
      const totalApplications = filteredApplications.length;
      const totalShortlisted = filteredApplications.filter(app => app.status === 'shortlisted').length;
      const totalRejected = filteredApplications.filter(app => app.status === 'rejected').length;
      const totalPending = filteredApplications.filter(app => app.status === 'pending').length;
      const totalJobs = jobsData.length;

      // Calculate total positions from active jobs only
      const totalPositions = jobsData.reduce((sum, job) => {
        const positions = parseInt(job.positions) || 0;
        return sum + positions;
      }, 0);

      // Calculate per-job statistics for active jobs only
      const jobStats = jobsData
        .filter(job => !filters.postedBy || job.posted_by_name === filters.postedBy)
        .map(job => {
          const jobApplications = filteredApplications.filter(app => app.job?.id === job.id);
          return {
            jobId: job.id,
            jobTitle: job.title,
            totalApplications: jobApplications.length,
            shortlisted: jobApplications.filter(app => app.status === 'shortlisted').length,
            rejected: jobApplications.filter(app => app.status === 'rejected').length,
            pending: jobApplications.filter(app => app.status === 'pending').length,
            positions: parseInt(job.positions) || 0,
          };
        });

      // Fetch upcoming interviews
      let interviewsQuery = supabase
        .from('interviews')
        .select(`
          id,
          stage,
          schedule_date,
          interviewer,
          application:applications (
            id,
            applicant_name,
            job:jobs (
              id,
              title
            )
          )
        `)
        .eq('status', 'scheduled')
        .gte('schedule_date', new Date().toISOString())
        .order('schedule_date', { ascending: true })
        .limit(5);

      // Filter by job IDs only if there are jobs to filter by
      if (jobIds.length > 0) {
        interviewsQuery = interviewsQuery.in('application.job_id', jobIds);
      }

      const { data: interviews, error: interviewsError } = await interviewsQuery;

      if (interviewsError) throw interviewsError;

      // Fetch pipeline stats for selected job
      let pipelineQuery = supabase
        .from('applications')
        .select(`
          id,
          status,
          current_stage,
          job_id,
          job:jobs (
            id,
            title,
            posted_by_name
          ),
          interviews (
            id,
            stage,
            status,
            schedule_date,
            feedback
          )
        `);

      // Filter by job IDs only if there are jobs to filter by
      if (jobIds.length > 0) {
        pipelineQuery = pipelineQuery.in('job_id', jobIds);
      }

      if (filters.jobId) {
        pipelineQuery = pipelineQuery.eq('job_id', filters.jobId);
      }
      if (filters.startDate) {
        pipelineQuery = pipelineQuery.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        pipelineQuery = pipelineQuery.lte('created_at', filters.endDate);
      }

      const { data: pipelineData, error: pipelineError } = await pipelineQuery;
      
      if (pipelineError) {
        console.error('Pipeline query error:', pipelineError);
        throw pipelineError;
      }

      // Filter pipeline data based on HR filter
      const filteredPipelineData = filters.postedBy
        ? pipelineData.filter(app => app.job?.posted_by_name === filters.postedBy)
        : pipelineData;

      const pipelineStats = {
        total: filteredPipelineData?.length || 0,
        inProgress: filteredPipelineData?.filter(app => app.status === 'in_progress').length || 0,
        shortlisted: filteredPipelineData?.filter(app => app.status === 'shortlisted').length || 0,
        rejected: filteredPipelineData?.filter(app => app.status === 'rejected').length || 0,
        standby: filteredPipelineData?.filter(app => app.status === 'standby').length || 0,
        telephonic: filteredPipelineData?.filter(app => {
          const appInterviews = app.interviews || [];
          return appInterviews.some(interview => 
            interview.stage === 'telephonic' && 
            (interview.status === 'scheduled' || interview.status === 'completed')
          );
        }).length || 0,
        technical: filteredPipelineData?.filter(app => {
          const appInterviews = app.interviews || [];
          return appInterviews.some(interview => 
            interview.stage === 'technical' && 
            (interview.status === 'scheduled' || interview.status === 'completed')
          );
        }).length || 0,
        onboarding: filteredPipelineData?.filter(app => {
          const appInterviews = app.interviews || [];
          return appInterviews.some(interview => 
            interview.stage === 'onboarding' && 
            (interview.status === 'scheduled' || interview.status === 'completed')
          );
        }).length || 0,
      };

      setStats({
        totalApplications,
        totalShortlisted,
        totalRejected,
        totalPending,
        totalJobs,
        totalPositions,
        jobStats,
        upcomingInterviews: interviews,
        jobs: jobsData,
        pipelineStats,
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    loading,
    error: errorState,
    stats,
    refresh: fetchStats,
  };
} 