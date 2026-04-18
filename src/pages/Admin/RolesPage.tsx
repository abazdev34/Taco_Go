import { useCallback, useEffect, useState } from 'react'
import {
  createRole,
  deleteRole,
  fetchRoles,
  updateRole,
} from '../../api/roles'
import type { IRoleRow } from '../../types/role'

function RolesPage() {
  const [roles, setRoles] = useState<IRoleRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [permissions, setPermissions] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await fetchRoles()
      setRoles(data)
    } catch (err) {
      console.error(err)
      setError('Не удалось загрузить роли')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setPermissions('')
  }

  const handleSubmit = async () => {
    if (!name.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const payload = {
        name: name.trim(),
        permissions: permissions.trim() || undefined,
      }

      if (editingId) {
        await updateRole(editingId, payload)
      } else {
        await createRole(payload)
      }

      resetForm()
      await load()
    } catch (err) {
      console.error(err)
      setError(editingId ? 'Не удалось обновить роль' : 'Не удалось создать роль')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (role: IRoleRow) => {
    setEditingId(role.id)
    setName(role.name || '')
    setPermissions(role.permissions || '')
  }

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Удалить эту роль?')
    if (!confirmed) return

    setError('')

    try {
      await deleteRole(id)

      if (editingId === id) {
        resetForm()
      }

      await load()
    } catch (err) {
      console.error(err)
      setError('Не удалось удалить роль')
    }
  }

  return (
    <div>
      <h1 style={styles.title}>Роли</h1>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.form}>
        <input
          style={styles.input}
          placeholder='Название роли'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder='Разрешения'
          value={permissions}
          onChange={(e) => setPermissions(e.target.value)}
        />

        <button
          style={styles.button}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Сохранение...' : editingId ? 'Обновить' : 'Создать'}
        </button>

        {editingId && (
          <button
            style={styles.cancelButton}
            onClick={resetForm}
            disabled={submitting}
          >
            Отмена
          </button>
        )}
      </div>

      {loading ? (
        <div style={styles.empty}>Загрузка...</div>
      ) : roles.length === 0 ? (
        <div style={styles.empty}>Роли не найдены</div>
      ) : (
        <div style={styles.list}>
          {roles.map((role) => (
            <div key={role.id} style={styles.card}>
              <div>
                <div style={styles.roleName}>{role.name}</div>
                <div style={styles.permission}>
                  {role.permissions || '—'}
                </div>
              </div>

              <div style={styles.actions}>
                <button
                  style={styles.editButton}
                  onClick={() => handleEdit(role)}
                  disabled={submitting}
                >
                  Изменить
                </button>

                <button
                  style={styles.deleteButton}
                  onClick={() => handleDelete(role.id)}
                  disabled={submitting}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    marginTop: 0,
    fontSize: '28px',
    fontWeight: 800,
  },
  error: {
    marginBottom: '16px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#fef3f2',
    color: '#b42318',
    border: '1px solid #fecdca',
  },
  form: {
    display: 'flex',
    gap: '12px',
    background: '#fff',
    border: '1px solid #eaeaea',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: '220px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #ccc',
  },
  button: {
    border: 'none',
    background: '#111',
    color: '#fff',
    borderRadius: '10px',
    padding: '12px 16px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  cancelButton: {
    border: '1px solid #ccc',
    background: '#fff',
    borderRadius: '10px',
    padding: '12px 16px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  list: {
    display: 'grid',
    gap: '12px',
  },
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    background: '#fff',
    border: '1px solid #eaeaea',
    borderRadius: '14px',
    padding: '16px',
    alignItems: 'center',
  },
  roleName: {
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '6px',
  },
  permission: {
    color: '#666',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    border: '1px solid #ccc',
    background: '#fff',
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
  },
  deleteButton: {
    border: 'none',
    background: '#d92d20',
    color: '#fff',
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#666',
    background: '#fff',
    border: '1px solid #eaeaea',
    borderRadius: '14px',
  },
}

export default RolesPage