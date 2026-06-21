import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import Login from './Login';

const BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

interface Person {
  id: string;
  name: string;
  age: number;
  phone?: string;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [persons, setPersons] = useState<Person[]>([]);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    console.log('App started — checking auth state');
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log('User already logged in:', firebaseUser.email);
      } else {
        console.log('No user logged in — showing login page');
      }
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      console.log('User', user.email, 'logged in — fetching persons');
      fetchAll();
    }
  }, [user]);

  function showSuccess(msg: string) { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
  function showError(msg: string) { setError(msg); setTimeout(() => setError(''), 3000); }

  async function getToken() {
    if (!user) return '';
    return await user.getIdToken();
  }

  async function authHeaders() {
    const token = await getToken();
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  async function fetchAll() {
    console.log('Fetching all persons from:', `${BASE}/persons`);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/persons`, { headers });
      const data = await res.json();
      setPersons(data.data || []);
      console.log('Fetched', data.data?.length || 0, 'persons successfully');
    } catch (err: any) {
      console.error('Failed to fetch persons:', err.message);
      showError('Failed to load data. Make sure the backend is running.');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !age) {
      console.warn('Validation failed — missing fields');
      showError('Name and Age are required.');
      return;
    }
    console.log('Creating person — name:', name, 'age:', age, 'phone:', phone);
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/persons`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: name.trim(), age: parseInt(age), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      console.log('Person created successfully:', data.data);
      setName(''); setAge(''); setPhone('');
      showSuccess('Person added successfully!');
      fetchAll();
    } catch (err: any) {
      console.error('Failed to create person:', err.message);
      showError(err.message);
    } finally { setLoading(false); }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim() || !editAge) {
      showError('Name and Age are required.');
      return;
    }
    console.log('Updating person ID:', id);
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/persons/${id}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ name: editName.trim(), age: parseInt(editAge), phone: editPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      console.log('Person updated successfully:', data.data);
      setEditId(null);
      showSuccess('Person updated successfully!');
      fetchAll();
    } catch (err: any) {
      console.error('Failed to update person:', err.message);
      showError(err.message);
    } finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete?')) {
      console.log('Delete cancelled for ID:', id);
      return;
    }
    console.log('Deleting person ID:', id);
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/persons/${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      console.log('Person deleted successfully. ID:', id);
      showSuccess('Person deleted successfully!');
      fetchAll();
    } catch (err: any) {
      console.error('Failed to delete person:', err.message);
      showError(err.message);
    } finally { setLoading(false); }
  }

  function startEdit(person: Person) {
    console.log('Edit clicked on person:', person.name);
    setEditId(person.id);
    setEditName(person.name);
    setEditAge(String(person.age));
    setEditPhone(person.phone || '');
  }

  async function handleLogout() {
    console.log('Logging out user:', user.email);
    await signOut(auth);
    console.log('User logged out successfully');
    setUser(null);
    setPersons([]);
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={(u: any) => {
      console.log('User logged in via Google:', u.email);
      setUser(u);
    }} />;
  }

  const filteredPersons = persons.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent)', marginBottom: '4px' }}>🗂️ CRUD App</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Welcome, {user.displayName}!</p>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>Log out</button>
        </div>

        {success && (<div style={{ background: '#064e3b', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>✅ {success}</div>)}
        {error && (<div style={{ background: '#450a0a', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>❌ {error}</div>)}

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text)', marginBottom: '20px' }}>➕ Add New Person</h2>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input style={{ flex: 1, minWidth: '150px', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }} placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
              <input style={{ width: '100px', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }} placeholder="Age" type="number" min="0" max="150" value={age} onChange={e => setAge(e.target.value)} />
              <input style={{ width: '160px', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }} placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
              <button type="submit" disabled={loading} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' }}>{loading ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text)' }}>
              📋 View Users ({filteredPersons.length})
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', width: '200px' }}
                placeholder="🔍 Search by name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button onClick={fetchAll} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>🔄 Refresh</button>
            </div>
          </div>

          {filteredPersons.length === 0 ? (
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '30px 0' }}>
              {searchTerm ? `No users found matching "${searchTerm}"` : 'No persons added yet. Add one above!'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: '600' }}>NAME</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: '600' }}>AGE</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: '600' }}>PHONE</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: '600' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersons.map(person => (
                    <tr key={person.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      {editId === person.id ? (
                        <>
                          <td style={{ padding: '10px 12px' }}>
                            <input style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--text)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }} value={editName} onChange={e => setEditName(e.target.value)} />
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <input style={{ width: '70px', background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--text)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }} type="number" value={editAge} onChange={e => setEditAge(e.target.value)} />
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <input style={{ width: '120px', background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--text)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }} value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <button onClick={() => handleUpdate(person.id)} disabled={loading} style={{ background: 'var(--success)', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '0.8rem', marginRight: '6px' }}>✅ Save</button>
                            <button onClick={() => setEditId(null)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: '600' }}>{person.name}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{person.age}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{person.phone || '—'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <button onClick={() => startEdit(person)} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', marginRight: '6px' }}>✏️ Edit</button>
                            <button onClick={() => handleDelete(person.id)} style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️ Delete</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}