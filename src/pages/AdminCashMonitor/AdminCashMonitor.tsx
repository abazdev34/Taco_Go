import { useState, useMemo } from 'react' // Исправлено: добавлены хуки
import {
  approveCashMovement,
  rejectCashMovement,
} from '../../api/cashMovements'
import { useCashMovements } from '../../hooks/useCashMovements'
import { formatPrice } from '../../utils/currency'
import './AdminCashMonitor.scss' // Исправлено: возвращено подключение стилей

const AdminCashMonitor = () => {
  const { movements, loading, error } = useCashMovements()
  const [adminName, setAdminName] = useState('Администратор')
  const [busyId, setBusyId] = useState('')

  const pendingMovements = useMemo(
    () => (movements || []).filter((item) => item.status === 'pending'),
    [movements]
  )

  const approvedInMovements = useMemo(
    () =>
      (movements || []).filter(
        (item) => item.status === 'approved' && item.movement_type === 'in'
      ),
    [movements]
  )

  const approvedOutMovements = useMemo(
    () =>
      (movements || []).filter(
        (item) => item.status === 'approved' && item.movement_type === 'out'
      ),
    [movements]
  )

  const rejectedMovements = useMemo(
    () => (movements || []).filter((item) => item.status === 'rejected'),
    [movements]
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
      await approveCashMovement(id, adminName)
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
      await rejectCashMovement(id, adminName)
    } catch (e: any) {
      console.error('REJECT CASH MOVEMENT ERROR:', e)
      alert(e?.message || 'Не удалось отклонить операцию')
    } finally {
      setBusyId('')
    }
  }

  const renderCard = (
    item: any,
    variant: 'pending' | 'approved-in' | 'approved-out' | 'rejected'
  ) => {
    const title =
      item.movement_type === 'in' ? 'Внесение в кассу' : 'Изъятие из кассы'

    return (
      <div
        key={item.id}
        className={`admin-cash-card ${
          variant === 'pending'
            ? 'pending'
            : variant === 'approved-in'
            ? 'approved-in'
            : variant === 'approved-out'
            ? 'approved-out'
            : 'rejected'
        }`}
      >
        <div className='admin-cash-card__top'>
          <strong>{title}</strong>
          <span>{formatPrice(Number(item.amount || 0))}</span>
        </div>

        <div className='admin-cash-card__meta'>
          <span>Кто отправил: {item.requested_by || '—'}</span>
          <span>
            Источник / направление: {item.source_name || '—'}
          </span>
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

        {variant === 'pending' && (
          <div className='admin-cash-card__actions'>
            <button
              type='button'
              className='admin-cash-btn approve'
              disabled={busyId === item.id}
              onClick={() => handleApprove(item.id)}
            >
              {busyId === item.id ? '...' : 'Подтвердить'}
            </button>

            <button
              type='button'
              className='admin-cash-btn reject'
              disabled={busyId === item.id}
              onClick={() => handleReject(item.id)}
            >
              Отклонить
            </button>
          </div>
        )}
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
            <p>Подтверждение внесений и изъятий денежных средств</p>
          </div>

          <div className='admin-cash-admin-box'>
            <label>Ответственный администратор</label>
            <input
              value={adminName}
              onChange={(e) => setAdminName(e.currentTarget.value)}
              placeholder='Введите имя администратора'
            />
          </div>
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
            <span>{pendingMovements.length}</span>
          </div>

          {loading ? (
            <div className='admin-cash-empty'>Загрузка...</div>
          ) : pendingMovements.length === 0 ? (
            <div className='admin-cash-empty'>
              Нет операций, ожидающих подтверждения
            </div>
          ) : (
            <div className='admin-cash-list'>
              {pendingMovements.map((item) => renderCard(item, 'pending'))}
            </div>
          )}
        </div>

        <div className='admin-cash-grid'>
          <section className='admin-cash-section'>
            <div className='admin-cash-section__head'>
              <h3>Подтвержденные внесения</h3>
              <span>{approvedInMovements.length}</span>
            </div>

            {approvedInMovements.length === 0 ? (
              <div className='admin-cash-empty'>Нет записей</div>
            ) : (
              <div className='admin-cash-list'>
                {approvedInMovements.map((item) =>
                  renderCard(item, 'approved-in')
                )}
              </div>
            )}
          </section>

          <section className='admin-cash-section'>
            <div className='admin-cash-section__head'>
              <h3>Подтвержденные изъятия</h3>
              <span>{approvedOutMovements.length}</span>
            </div>

            {approvedOutMovements.length === 0 ? (
              <div className='admin-cash-empty'>Нет записей</div>
            ) : (
              <div className='admin-cash-list'>
                {approvedOutMovements.map((item) =>
                  renderCard(item, 'approved-out')
                )}
              </div>
            )}
          </section>
        </div>

        <div className='admin-cash-section'>
          <div className='admin-cash-section__head'>
            <h3>Отклоненные операции</h3>
            <span>{rejectedMovements.length}</span>
          </div>

          {rejectedMovements.length === 0 ? (
            <div className='admin-cash-empty'>Нет отклоненных операций</div>
          ) : (
            <div className='admin-cash-list'>
              {rejectedMovements.map((item) => renderCard(item, 'rejected'))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminCashMonitor
