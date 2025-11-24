import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Video, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { useStudentSchedule } from '../../src/hooks/useStudentSchedule';
import { Session } from '../../types';

const CountdownTimer: React.FC<{ targetDate: string }> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="text-4xl md:text-5xl font-display font-bold text-dark mb-6 tracking-tight">
      {formatNumber(timeLeft.hours)} <span className="text-gray-300">:</span> {formatNumber(timeLeft.minutes)} <span className="text-gray-300">:</span> {formatNumber(timeLeft.seconds)}
    </div>
  );
};

export const StudentSchedule: React.FC = () => {
  const { upcomingSessions, nextSession, loading, error } = useStudentSchedule();

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
          <Calendar className="text-primary" /> My Schedule
        </h1>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
          <Calendar className="text-primary" /> My Schedule
        </h1>
        <div className="p-8 text-center">
          <div className="text-red-500 mb-4">⚠️ Error loading schedule</div>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const getNextSessionDateTime = () => {
    if (!nextSession) return null;
    return new Date(`${nextSession.session_date}T${nextSession.start_time}`);
  };

  const isSessionJoinable = (session: Session) => {
    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();
    const tenMinutesBefore = new Date(sessionDateTime.getTime() - 10 * 60 * 1000);
    return now >= tenMinutesBefore && now <= new Date(sessionDateTime.getTime() + 90 * 60 * 1000);
  };

  const isSessionSoon = (session: Session) => {
    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();
    const thirtyMinutesBefore = new Date(sessionDateTime.getTime() - 30 * 60 * 1000);
    return now >= thirtyMinutesBefore && now < sessionDateTime;
  };

  const getSessionJoinUrl = (session: Session) => {
    // Prioritize zoom_join_url if available, fallback to meeting_link
    return session.zoom_join_url || session.meeting_link;
  };

  const isZoomMeeting = (session: Session) => {
    return !!(session.zoom_join_url || session.zoom_meeting_id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
        <Calendar className="text-primary" /> My Schedule
      </h1>

      {nextSession && (
        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl p-8 text-center border border-primary/20 shadow-lg mb-8">
          <p className="text-gray-600 mb-2 font-medium">Next Session Starts In</p>
          <CountdownTimer targetDate={`${nextSession.session_date}T${nextSession.start_time}`} />

          {getSessionJoinUrl(nextSession) ? (
            <div className="space-y-3">
              <Button
                variant="primary"
                className="gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                onClick={() => window.open(getSessionJoinUrl(nextSession), '_blank')}
                disabled={!isSessionJoinable(nextSession)}
              >
                <Video size={18} />
                {isSessionJoinable(nextSession)
                  ? `Join ${isZoomMeeting(nextSession) ? 'Zoom' : 'Class'} Meeting`
                  : `Join Opens in ${Math.ceil((new Date(`${nextSession.session_date}T${nextSession.start_time}`).getTime() - new Date().getTime()) / 60000)} mins`
                }
              </Button>

              {isZoomMeeting(nextSession) && isSessionJoinable(nextSession) && (
                <p className="text-xs text-gray-500">
                  ✓ Zoom meeting is ready • {nextSession.zoom_password && `Password: ${nextSession.zoom_password}`}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Button variant="outline" disabled className="gap-2">
                <AlertCircle size={18} /> Meeting Link Not Available
              </Button>
              <p className="text-xs text-gray-500">Meeting will be created soon</p>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4">
            {isSessionJoinable(nextSession)
              ? '✓ You can join the meeting now'
              : 'Link becomes active 10 mins before class'
            }
          </p>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-bold text-dark text-lg">Upcoming Sessions</h3>

        {upcomingSessions.length > 0 ? (
          upcomingSessions.map((session) => {
            const sessionDate = new Date(session.session_date);
            const month = sessionDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const day = sessionDate.getDate();
            const startTime = new Date(`2000-01-01T${session.start_time}`).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: false
            });
            const endTime = new Date(`2000-01-01T${session.start_time}`).getTime() + 90 * 60 * 1000;
            const endTimeFormatted = new Date(endTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: false
            });

            return (
              <div key={session.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center hover:border-primary/30 transition-colors">
                <div className="flex md:flex-col items-center gap-2 md:gap-0 bg-gray-50 p-3 rounded-xl min-w-[80px] text-center border border-gray-200">
                  <span className="text-xs font-bold text-gray-500 uppercase">{month}</span>
                  <span className="text-2xl font-bold text-dark">{day}</span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-lg text-dark">{session.title}</h4>
                    {isSessionSoon(session) && <span className="text-[10px] font-bold bg-accent text-dark px-2 py-0.5 rounded-full">LIVE SOON</span>}
                  </div>
                  <p className="text-gray-500 text-sm mb-3">{session.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-600">
                    <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                      <Clock size={14} className="text-primary" /> {startTime} - {endTimeFormatted}
                    </span>
                    <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                      <Video size={14} className={isZoomMeeting(session) ? "text-blue-500" : "text-secondary"} />
                      {isZoomMeeting(session) ? 'Zoom Meeting' : 'Online Class'}
                    </span>
                    {isSessionSoon(session) && (
                      <span className="flex items-center gap-1 bg-accent/20 px-2 py-1 rounded animate-pulse">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Starting Soon
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-auto">
                  {getSessionJoinUrl(session) ? (
                    isSessionJoinable(session) ? (
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        className="gap-2 hover:scale-105 transition-transform"
                        onClick={() => window.open(getSessionJoinUrl(session), '_blank')}
                      >
                        <Video size={16} /> Join {isZoomMeeting(session) ? 'Zoom' : 'Class'}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" fullWidth disabled className="opacity-50 cursor-not-allowed">
                        <Clock size={16} /> Starts Later
                      </Button>
                    )
                  ) : (
                    <Button variant="outline" size="sm" fullWidth disabled className="opacity-50 cursor-not-allowed">
                      <AlertCircle size={16} /> No Link Yet
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No upcoming sessions scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
};