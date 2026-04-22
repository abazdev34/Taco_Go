import { useMemo, useState } from 'react'
import { formatPrice } from '../../utils/currency'
import { useCashMovements } from '../../hooks/useCashMovements'
import './AdminCashMonitor.scss'

type TMovementStatus = 'pending' | 'approved' | 'rejected'
type TMovementType = 'in' | 'out'

type TCashMovement = {
  id: string
  status: TMovementStatus
  movement_type: TMovementType
  amount: number | string | null
  requested_by?: string | null
  source_name?: string | null
  description?: string | null
  created_at?: string | null
  approved_by?: string | null
  approved_at?: string | null
}

const CheckIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M5 12.5 9.5 17 19 7.5'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M6 6l12 12M18 6 6 18'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.2'
      strokeLinecap='round'
    />
  </svg>
)

const TrashIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M4 7h16M9 7V5h6v2m-7 3v7m4-7v7m4-7v7M7 7l1 12h8l1-12'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

function AdminCashMonitor() {
  const {
    movements,
    loading,
    error,
    refetch,
    removeOne,
    clearByStatus,
    clearAll,
  } = useCashMovements()

  const [adminName, setAdminName] = useState('Администратор')
  const [busyId, setBusyId] = useState('')
  const [sectionBusy, setSectionBusy] = useState('')

  const safeMovements = useMemo(
    () => ((movements || []) as TCashMovement[]).slice(),
    [movements]
  )

  const pendingMovements = useMemo(
    () => safeMovements.filter(item => item.status === 'pending'),
    [safeMovements]
  )

  const approvedInMovements = useMemo(
    () =>
      safeMovements.filter(
        item => item.status === 'approved' && item.movement_type === 'in'
      ),
    [safeMovements]
  )

  const approvedOutMovements = useMemo(
    () =>
      safeMovements.filter(
        item => item.status === 'approved' && item.movement_type === 'out'
      ),
    [safeMovements]
  )

  const rejectedMovements = useMemo(
    () => safeMovements.filter(item => item.status === 'rejected'),
    [safeMovements]
  )

  const approvedInTotal = useMemo(
    () =>
      approvedInMovements.reduce(
        (acc, item) => acc + Number(item.amount || 0),
        0
      ),
    [approvedInMovements]
  )

  const approvedOutTotal = useMemo(
    () =>
      approvedOutMovements.reduce(
        (acc, item) => acc + Number(item.amount || 0),
        0
      ),
    [approvedOutMovements]
  )

  const handleApprove = async (id: string) => {
    try {
      setBusyId(id)
      const { approveCashMovement } = await import('../../api/cashMovements')
      await approveCashMovement(id, adminName.trim() || 'Администратор')
      await refetch()
    } catch (e: any) {
      console.error('APPROVE CASH MOVEMENT ERROR:', e)
      alert(e?.message || 'Не удалось подтвердить операцию')
    } finally {
      setBusyId('')
    }
  }

  const handleReject = async (id: string) => {
    try {
      setBusyId(id)
      const { rejectCashMovement } = await import('../../api/cashMovements')
      await rejectCashMovement(id, adminName.trim() || 'Администратор')
      await refetch()
    } catch (e: any) {
      console.error('REJECT CASH MOVEMENT ERROR:', e)
      alert(e?.message || 'Не удалось отклонить операцию')
    } finally {
      setBusyId('')
    }
  }

  const handleDeleteOne = async (id: string) => {
    try {
      setBusyId(id)
      await removeOne(id)
    } catch (e: any) {
      console.error('DELETE CASH MOVEMENT ERROR:', e)
      alert(e?.message || 'Не удалось удалить запись')
    } finally {
      setBusyId('')
    }
  }

  const handleClearSection = async (
    key: string,
    statuses: TMovementStatus[],
    type?: TMovementType
  ) => {
    try {
      setSectionBusy(key)

      if (type) {
        const ids = safeMovements
          .filter(
            item =>
              statuses.includes(item.status) && item.movement_type === type
          )
          .map(item => item.id)

        const { deleteCashMovements } = await import('../../api/cashMovements')
        await deleteCashMovements(ids)
        await refetch()
      } else {
        await clearByStatus(statuses)
      }
    } catch (e: any) {
      console.error('CLEAR CASH SECTION ERROR:', e)
      alert(e?.message || 'Не удалось очистить раздел')
    } finally {
      setSectionBusy('')
    }
  }

  const handleClearAll = async () => {
    try {
      setSectionBusy('all')
      await clearAll()
    } catch (e: any) {
      console.error('CLEAR ALL CASH MOVEMENTS ERROR:', e)
      alert(e?.message || 'Не удалось очистить журнал')
    } finally {
      setSectionBusy('')
    }
  }

  const renderCard = (
    item: TCashMovement,
    variant: 'pending' | 'approved-in' | 'approved-out' | 'rejected'
  ) => {
    const title =
      item.movement_type === 'in' ? 'Внесение в кассу' : 'Изъятие из кассы'

    return (
      <div key={item.id} className={`admin-cash-card ${variant}`}>
        <div className='admin-cash-card__top'>
          <strong>{title}</strong>
          <span>{formatPrice(Number(item.amount || 0))}</span>
        </div>

        <div className='admin-cash-card__meta'>
          <span>Кто отправил: {item.requested_by || '—'}</span>
          <span>Источник / направление: {item.source_name || '—'}</span>
          <span>Описание: {item.description || '—'}</span>
          <span>
            Создано:{' '}
            {item.created_at
              ? new Date(item.created_at).toLocaleString('ru-RU')
              : '—'}
          </span>

          {item.approved_by && (
            <span>Кто подтвердил: {item.approved_by}</span>
          )}

          {item.approved_at && (
            <span>
              Когда обработано:{' '}
              {new Date(item.approved_at).toLocaleString('ru-RU')}
            </span>
          )}
        </div>

        <div className='admin-cash-card__bottom'>
          {variant === 'pending' && (
            <div className='admin-cash-card__actions'>
              <button
                type='button'
                className='admin-cash-btn approve'
                disabled={busyId === item.id}
                onClick={() => handleApprove(item.id)}
              >
                <span className='admin-cash-btn__icon'>
                  <CheckIcon />
                </span>
                <span>{busyId === item.id ? '...' : 'Подтвердить'}</span>
              </button>

              <button
                type='button'
                className='admin-cash-btn reject'
                disabled={busyId === item.id}
                onClick={() => handleReject(item.id)}
              >
                <span className='admin-cash-btn__icon'>
                  <CloseIcon />
                </span>
                <span>{busyId === item.id ? '...' : 'Отклонить'}</span>
              </button>
            </div>
          )}

          <button
            type='button'
            className='admin-cash-btn delete'
            disabled={busyId === item.id}
            onClick={() => handleDeleteOne(item.id)}
          >
            <span className='admin-cash-btn__icon'>
              <TrashIcon />
            </span>
            <span>{busyId === item.id ? '...' : 'Удалить'}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='admin-cash-page'>
      <div className='admin-cash-shell'>
        {error && <div className='admin-cash-error'>{error}</div>}

        <div className='admin-cash-header'>
          <div>
            <h1>Администрирование кассы</h1>
            <p>Подтверждение, отклонение и журнал кассовых операций</p>
          </div>

          <div className='admin-cash-admin-box'>
            <label>Ответственный администратор</label>
            <input
              value={adminName}
              onChange={e => setAdminName(e.currentTarget.value)}
              placeholder='Введите имя администратора'
            />
          </div>
        </div>

        <div className='admin-cash-toolbar'>
          <button
            type='button'
            className='admin-cash-toolbar-btn danger'
            disabled={sectionBusy === 'all'}
            onClick={handleClearAll}
          >
            <span className='admin-cash-btn__icon'>
              <TrashIcon />
            </span>
            <span>{sectionBusy === 'all' ? '...' : 'Очистить весь журнал'}</span>
          </button>
        </div>

        <div className='admin-cash-summary'>
          <div className='admin-cash-summary__card income'>
            <span>Подтверждено внесений</span>
            <strong>{formatPrice(approvedInTotal)}</strong>
          </div>

          <div className='admin-cash-summary__card expense'>
            <span>Подтверждено изъятий</span>
            <strong>{formatPrice(approvedOutTotal)}</strong>
          </div>

          <div className='admin-cash-summary__card neutral'>
            <span>Ожидают подтверждения</span>
            <strong>{pendingMovements.length}</strong>
          </div>

          <div className='admin-cash-summary__card rejected'>
            <span>Отклонено</span>
            <strong>{rejectedMovements.length}</strong>
          </div>
        </div>

        <div className='admin-cash-section'>
          <div className='admin-cash-section__head'>
            <h3>Запросы на подтверждение</h3>
            <div className='admin-cash-section__tools'>
              <span>{pendingMovements.length}</span>
              <button
                type='button'
                className='admin-cash-head-btn'
                disabled={sectionBusy === 'pending'}
                onClick={() => handleClearSection('pending', ['pending'])}
              >
                <TrashIcon />
              </button>
            </div>
          </div>

          {loading ? (
            <div className='admin-cash-empty'>Загрузка...</div>
          ) : pendingMovements.length === 0 ? (
            <div className='admin-cash-empty'>
              Нет операций, ожидающих подтверждения
            </div>
          ) : (
            <div className='admin-cash-list'>
              {pendingMovements.map(item => renderCard(item, 'pending'))}
            </div>
          )}
        </div>

        <div className='admin-cash-grid'>
          <section className='admin-cash-section'>
            <div className='admin-cash-section__head'>
              <h3>Подтвержденные внесения</h3>
              <div className='admin-cash-section__tools'>
                <span>{approvedInMovements.length}</span>
                <button
                  type='button'
                  className='admin-cash-head-btn'
                  disabled={sectionBusy === 'approved-in'}
                  onClick={() =>
                    handleClearSection('approved-in', ['approved'], 'in')
                  }
                >
                  <TrashIcon />
                </button>
              </div>
            </div>

            {approvedInMovements.length === 0 ? (
              <div className='admin-cash-empty'>Нет записей</div>
            ) : (
              <div className='admin-cash-list'>
                {approvedInMovements.map(item =>
                  renderCard(item, 'approved-in')
                )}
              </div>
            )}
          </section>

          <section className='admin-cash-section'>
            <div className='admin-cash-section__head'>
              <h3>Подтвержденные изъятия</h3>
              <div className='admin-cash-section__tools'>
                <span>{approvedOutMovements.length}</span>
                <button
                  type='button'
                  className='admin-cash-head-btn'
                  disabled={sectionBusy === 'approved-out'}
                  onClick={() =>
                    handleClearSection('approved-out', ['approved'], 'out')
                  }
                >
                  <TrashIcon />
                </button>
              </div>
            </div>

            {approvedOutMovements.length === 0 ? (
              <div className='admin-cash-empty'>Нет записей</div>
            ) : (
              <div className='admin-cash-list'>
                {approvedOutMovements.map(item =>
                  renderCard(item, 'approved-out')
                )}
              </div>
            )}
          </section>
        </div>

        <div className='admin-cash-section'>
          <div className='admin-cash-section__head'>
            <h3>Отклоненные операции</h3>
            <div className='admin-cash-section__tools'>
              <span>{rejectedMovements.length}</span>
              <button
                type='button'
                className='admin-cash-head-btn'
                disabled={sectionBusy === 'rejected'}
                onClick={() => handleClearSection('rejected', ['rejected'])}
              >
                <TrashIcon />
              </button>
            </div>
          </div>

          {rejectedMovements.length === 0 ? (
            <div className='admin-cash-empty'>Нет отклоненных операций</div>
          ) : (
            <div className='admin-cash-list'>
              {rejectedMovements.map(item => renderCard(item, 'rejected'))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminCashMonitor