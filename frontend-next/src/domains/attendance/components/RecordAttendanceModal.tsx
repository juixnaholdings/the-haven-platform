'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import Link from 'next/link'

import { queryClient } from '@/api/queryClient'
import {
  ErrorAlert,
  FormModalShell,
  FormSection,
  StatusBadge
} from '@/components'
import { attendanceApi } from '@/domains/attendance/api'
import {
  ATTENDANCE_STATUS_OPTIONS,
  SERVICE_EVENT_TYPE_OPTIONS
} from '@/domains/attendance/options'
import { membersApi } from '@/domains/members/api'
import type {
  AttendanceSummaryWritePayload,
  MemberAttendanceCreatePayload,
  ServiceEventDetail,
  ServiceEventWritePayload
} from '@/domains/types'
import { formatDate, toIsoDateTime } from '@/lib/formatters'

interface EventFormState {
  title: string
  event_type: string
  service_date: string
  start_time: string
  end_time: string
  location: string
  notes: string
  is_active: boolean
}

interface SummaryFormState {
  men_count: string
  women_count: string
  children_count: string
  visitor_count: string
  notes: string
}

interface MemberAttendanceDraftState {
  member_id: string
  status: string
  checked_in_at: string
  notes: string
}

interface MemberAttendanceDraft extends MemberAttendanceDraftState {
  client_id: string
}

interface RecordAttendanceWorkflowResult {
  serviceEvent: ServiceEventDetail
}

class RecordAttendanceWorkflowError extends Error {
  eventId: number
  memberRowsSaved: number
  summarySaved: boolean
  sourceError: unknown

  constructor ({
    eventId,
    memberRowsSaved,
    summarySaved,
    sourceError
  }: {
    eventId: number
    memberRowsSaved: number
    summarySaved: boolean
    sourceError: unknown
  }) {
    super('Event was created, but attendance recording did not finish.')
    this.name = 'RecordAttendanceWorkflowError'
    this.eventId = eventId
    this.memberRowsSaved = memberRowsSaved
    this.summarySaved = summarySaved
    this.sourceError = sourceError
  }
}

interface RecordAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  onCompleted?: (serviceEvent: ServiceEventDetail) => void
  title?: string
  description?: string
}

function toDateInputValue (value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toTimeInputValue (value: Date) {
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function getDefaultEventFormState (): EventFormState {
  const now = new Date()
  const end = new Date(now)
  end.setHours(now.getHours() + 2)

  return {
    title: '',
    event_type: 'OTHER',
    service_date: toDateInputValue(now),
    start_time: toTimeInputValue(now),
    end_time: toTimeInputValue(end),
    location: '',
    notes: '',
    is_active: true
  }
}

function getDefaultSummaryFormState (): SummaryFormState {
  return {
    men_count: '0',
    women_count: '0',
    children_count: '0',
    visitor_count: '0',
    notes: ''
  }
}

function getDefaultMemberAttendanceDraftState (): MemberAttendanceDraftState {
  return {
    member_id: '',
    status: 'PRESENT',
    checked_in_at: '',
    notes: ''
  }
}

function toSafeCount (value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }
  return parsed
}

function toEventPayload (formState: EventFormState): ServiceEventWritePayload {
  return {
    title: formState.title,
    event_type: formState.event_type,
    service_date: formState.service_date,
    start_time: formState.start_time || null,
    end_time: formState.end_time || null,
    location: formState.location || undefined,
    notes: formState.notes || undefined,
    is_active: formState.is_active
  }
}

function toSummaryPayload (
  formState: SummaryFormState
): AttendanceSummaryWritePayload {
  const menCount = toSafeCount(formState.men_count)
  const womenCount = toSafeCount(formState.women_count)
  const childrenCount = toSafeCount(formState.children_count)
  const visitorCount = toSafeCount(formState.visitor_count)

  return {
    men_count: menCount,
    women_count: womenCount,
    children_count: childrenCount,
    visitor_count: visitorCount,
    total_count: menCount + womenCount + childrenCount,
    notes: formState.notes || undefined
  }
}

function toMemberAttendancePayload (
  row: MemberAttendanceDraft
): MemberAttendanceCreatePayload {
  return {
    member_id: Number(row.member_id),
    status: row.status,
    checked_in_at: toIsoDateTime(row.checked_in_at),
    notes: row.notes || undefined
  }
}

export function RecordAttendanceModal ({
  isOpen,
  onClose,
  onCompleted,
  title = 'Record attendance',
  description,
}: RecordAttendanceModalProps) {
  const [eventFormState, setEventFormState] = useState<EventFormState>(() =>
    getDefaultEventFormState()
  )
  const [summaryFormState, setSummaryFormState] = useState<SummaryFormState>(
    () => getDefaultSummaryFormState()
  )
  const [memberSearch, setMemberSearch] = useState('')
  const [memberDraftState, setMemberDraftState] =
    useState<MemberAttendanceDraftState>(() =>
      getDefaultMemberAttendanceDraftState()
    )
  const [memberDraftRows, setMemberDraftRows] = useState<
    MemberAttendanceDraft[]
  >([])
  const deferredMemberSearch = useDeferredValue(memberSearch)
  const resetWorkflowState = () => {
    setEventFormState(getDefaultEventFormState())
    setSummaryFormState(getDefaultSummaryFormState())
    setMemberSearch('')
    setMemberDraftState(getDefaultMemberAttendanceDraftState())
    setMemberDraftRows([])
  }
  const handleClose = () => {
    resetWorkflowState()
    onClose()
  }

  const membersQuery = useQuery({
    enabled: isOpen,
    queryKey: ['members', 'record-attendance-modal', deferredMemberSearch],
    queryFn: () =>
      membersApi.listMembers({
        search: deferredMemberSearch || undefined,
        is_active: true
      })
  })

  const selectedMemberIds = useMemo(
    () => new Set(memberDraftRows.map(row => Number(row.member_id))),
    [memberDraftRows]
  )

  const memberOptions = useMemo(
    () =>
      (membersQuery.data ?? []).filter(
        member => !selectedMemberIds.has(member.id)
      ),
    [membersQuery.data, selectedMemberIds]
  )

  const summaryPayload = useMemo(
    () => toSummaryPayload(summaryFormState),
    [summaryFormState]
  )

  const workflowMutation = useMutation({
    mutationFn: async (): Promise<RecordAttendanceWorkflowResult> => {
      const createdEvent = await attendanceApi.createServiceEvent(
        toEventPayload(eventFormState)
      )
      let summarySaved = false
      let memberRowsSaved = 0

      try {
        await attendanceApi.upsertAttendanceSummary(
          createdEvent.id,
          summaryPayload
        )
        summarySaved = true

        for (const row of memberDraftRows) {
          await attendanceApi.createMemberAttendance(
            createdEvent.id,
            toMemberAttendancePayload(row)
          )
          memberRowsSaved += 1
        }
      } catch (error) {
        throw new RecordAttendanceWorkflowError({
          eventId: createdEvent.id,
          memberRowsSaved,
          summarySaved,
          sourceError: error
        })
      }

      return { serviceEvent: createdEvent }
    },
    onSuccess: async ({ serviceEvent }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['service-events'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance-overview'] }),
        queryClient.invalidateQueries({
          queryKey: ['attendance-overview-events']
        }),
        queryClient.invalidateQueries({ queryKey: ['reporting'] })
      ])
      resetWorkflowState()
      onCompleted?.(serviceEvent)
      onClose()
    }
  })

  const workflowError =
    workflowMutation.error instanceof RecordAttendanceWorkflowError
      ? workflowMutation.error
      : null

  const isAddMemberDisabled = !memberDraftState.member_id
  const isSubmitDisabled =
    workflowMutation.isPending ||
    !eventFormState.title.trim() ||
    !eventFormState.service_date

  return (
    <FormModalShell
      description={description}
      footer={
        <>
          <button
            className='button button-secondary'
            onClick={handleClose}
            type='button'
          >
            Cancel
          </button>
          <button
            className='button button-primary'
            disabled={isSubmitDisabled}
            form='record-attendance-modal-form'
            type='submit'
          >
            {workflowMutation.isPending ? 'Recording...' : 'Submit Record'}
          </button>
        </>
      }
      isOpen={isOpen}
      onClose={handleClose}
      size='large'
      title={title}
    >
      <form
        className='space-y-6'
        id='record-attendance-modal-form'
        onSubmit={event => {
          event.preventDefault()
          workflowMutation.mutate()
        }}
      >
        <FormSection
          description={
            <section className='mt-2.5 text-sm text-slate-600'>
              <div className='flex flex-wrap items-center gap-2'>
                <StatusBadge label='Today' tone='info' />
                <span>{formatDate(new Date().toISOString())}</span>
              </div>
            </section>
          }
          title='Event details'
        >
          <div className='grid gap-4 md:grid-cols-2'>
            <label className='field md:col-span-2'>
              <span>Event title</span>
              <input
                onChange={event =>
                  setEventFormState(current => ({
                    ...current,
                    title: event.target.value
                  }))
                }
                placeholder='Sunday Service, Midweek Prayer, Youth Meeting...'
                required
                value={eventFormState.title}
              />
            </label>

            <label className='field'>
              <span>Event type</span>
              <select
                onChange={event =>
                  setEventFormState(current => ({
                    ...current,
                    event_type: event.target.value
                  }))
                }
                value={eventFormState.event_type}
              >
                {SERVICE_EVENT_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className='field'>
              <span>Service date</span>
              <input
                onChange={event =>
                  setEventFormState(current => ({
                    ...current,
                    service_date: event.target.value
                  }))
                }
                required
                type='date'
                value={eventFormState.service_date}
              />
            </label>

            <label className='field'>
              <span>Start time</span>
              <input
                onChange={event =>
                  setEventFormState(current => ({
                    ...current,
                    start_time: event.target.value
                  }))
                }
                type='time'
                value={eventFormState.start_time}
              />
            </label>

            <label className='field'>
              <span>End time</span>
              <input
                onChange={event =>
                  setEventFormState(current => ({
                    ...current,
                    end_time: event.target.value
                  }))
                }
                type='time'
                value={eventFormState.end_time}
              />
            </label>

            <label className='field md:col-span-2'>
              <span>Location</span>
              <input
                onChange={event =>
                  setEventFormState(current => ({
                    ...current,
                    location: event.target.value
                  }))
                }
                value={eventFormState.location}
              />
            </label>

            <label className='checkbox-field checkbox-field-inline'>
              <input
                checked={eventFormState.is_active}
                onChange={event =>
                  setEventFormState(current => ({
                    ...current,
                    is_active: event.target.checked
                  }))
                }
                type='checkbox'
              />
              <span>Event is active</span>
            </label>
          </div>

          <label className='field'>
            <span>Event notes</span>
            <textarea
              onChange={event =>
                setEventFormState(current => ({
                  ...current,
                  notes: event.target.value
                }))
              }
              rows={3}
              value={eventFormState.notes}
            />
          </label>
        </FormSection>

        <FormSection
          description='Anonymous attendance summary values. Total is derived from men + women + children.'
          title='Attendance summary'
        >
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
            <label className='field'>
              <span>Men</span>
              <input
                min='0'
                onChange={event =>
                  setSummaryFormState(current => ({
                    ...current,
                    men_count: event.target.value
                  }))
                }
                type='number'
                value={summaryFormState.men_count}
              />
            </label>

            <label className='field'>
              <span>Women</span>
              <input
                min='0'
                onChange={event =>
                  setSummaryFormState(current => ({
                    ...current,
                    women_count: event.target.value
                  }))
                }
                type='number'
                value={summaryFormState.women_count}
              />
            </label>

            <label className='field'>
              <span>Children</span>
              <input
                min='0'
                onChange={event =>
                  setSummaryFormState(current => ({
                    ...current,
                    children_count: event.target.value
                  }))
                }
                type='number'
                value={summaryFormState.children_count}
              />
            </label>

            <label className='field'>
              <span>Visitors</span>
              <input
                min='0'
                onChange={event =>
                  setSummaryFormState(current => ({
                    ...current,
                    visitor_count: event.target.value
                  }))
                }
                type='number'
                value={summaryFormState.visitor_count}
              />
            </label>

            <div className='rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4'>
              <dt>Derived total</dt>
              <dd className='m-0 mt-1 text-lg font-semibold text-slate-900'>
                {summaryPayload.total_count}
              </dd>
            </div>
          </div>

          <label className='field'>
            <span>Summary notes</span>
            <textarea
              onChange={event =>
                setSummaryFormState(current => ({
                  ...current,
                  notes: event.target.value
                }))
              }
              rows={3}
              value={summaryFormState.notes}
            />
          </label>
        </FormSection>

        <FormSection
          description='Add member-level rows when available. You can keep this empty and complete member attendance later.'
          title='Member attendance'
        >
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <label className='field xl:col-span-2'>
              <span>Search member directory</span>
              <input
                onChange={event => setMemberSearch(event.target.value)}
                placeholder='Search by member name, email, or phone'
                value={memberSearch}
              />
            </label>

            <label className='field xl:col-span-2'>
              <span>Choose member</span>
              <select
                onChange={event =>
                  setMemberDraftState(current => ({
                    ...current,
                    member_id: event.target.value
                  }))
                }
                value={memberDraftState.member_id}
              >
                <option value=''>Select member</option>
                {memberOptions.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                    {member.email
                      ? ` | ${member.email}`
                      : member.phone_number
                      ? ` | ${member.phone_number}`
                      : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className='field'>
              <span>Status</span>
              <select
                onChange={event =>
                  setMemberDraftState(current => ({
                    ...current,
                    status: event.target.value
                  }))
                }
                value={memberDraftState.status}
              >
                {ATTENDANCE_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className='field'>
              <span>Checked in at</span>
              <input
                onChange={event =>
                  setMemberDraftState(current => ({
                    ...current,
                    checked_in_at: event.target.value
                  }))
                }
                type='datetime-local'
                value={memberDraftState.checked_in_at}
              />
            </label>

            <label className='field xl:col-span-2'>
              <span>Member notes</span>
              <input
                onChange={event =>
                  setMemberDraftState(current => ({
                    ...current,
                    notes: event.target.value
                  }))
                }
                value={memberDraftState.notes}
              />
            </label>
          </div>

          <div className='flex flex-wrap items-center gap-2.5'>
            <button
              className='button button-secondary'
              disabled={isAddMemberDisabled}
              onClick={() => {
                if (!memberDraftState.member_id) {
                  return
                }

                setMemberDraftRows(current => [
                  ...current,
                  {
                    client_id: `${memberDraftState.member_id}-${Date.now()}-${
                      current.length
                    }`,
                    ...memberDraftState
                  }
                ])
                setMemberDraftState(current => ({
                  ...getDefaultMemberAttendanceDraftState(),
                  status: current.status
                }))
              }}
              type='button'
            >
              Add member row
            </button>
            <p className='m-0 text-sm text-slate-500'>
              {membersQuery.isLoading
                ? 'Loading members...'
                : `${memberOptions.length} eligible member${
                    memberOptions.length === 1 ? '' : 's'
                  } available.`}
            </p>
          </div>

          {memberDraftRows.length > 0 ? (
            <ul className='item-list'>
              {memberDraftRows.map(row => {
                const member = (membersQuery.data ?? []).find(
                  candidate => candidate.id === Number(row.member_id)
                )
                return (
                  <li className='item-row' key={row.client_id}>
                    <div>
                      <strong>
                        {member?.full_name || `Member #${row.member_id}`}
                      </strong>
                      <span>
                        {ATTENDANCE_STATUS_OPTIONS.find(
                          option => option.value === row.status
                        )?.label || row.status}
                        {row.checked_in_at
                          ? ` | ${formatDate(row.checked_in_at)}`
                          : ''}
                      </span>
                    </div>
                    <button
                      className='button button-ghost button-compact'
                      onClick={() => {
                        setMemberDraftRows(current =>
                          current.filter(
                            entry => entry.client_id !== row.client_id
                          )
                        )
                      }}
                      type='button'
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className='m-0 text-sm text-slate-500'>
              No member rows added yet.
            </p>
          )}
        </FormSection>

        {workflowError ? (
          <section className='rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-900'>
            <strong>Event created, attendance still incomplete.</strong>
            <p className='mb-0 mt-2'>
              Summary saved: {workflowError.summarySaved ? 'Yes' : 'No'} |
              Member rows saved: {workflowError.memberRowsSaved}
            </p>
            <p className='mb-0 mt-2'>
              Continue from the event attendance page:{' '}
              <Link
                className='font-semibold underline'
                href={`/events/${workflowError.eventId}/attendance`}
              >
                Open event attendance
              </Link>
            </p>
          </section>
        ) : null}

        <ErrorAlert
          error={workflowError?.sourceError ?? workflowMutation.error}
          fallbackMessage='Attendance workflow could not be completed.'
        />
      </form>
    </FormModalShell>
  )
}
