import React, { useEffect, useRef, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import api from './api';
import { AuthProvider, ProtectedRoute, RoleRoute, useAuth } from './auth';
import homepageImage from '../images/homepage.jpg';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5555/api').replace('/api', '');

const appShell = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #f6f5ef 0%, #ffffff 40%, #f2f0e8 100%)',
  color: '#1f2937',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const container = {
  width: 'min(1180px, calc(100% - 32px))',
  margin: '0 auto',
};

const card = {
  background: '#fff',
  border: '1px solid rgba(31, 41, 55, 0.08)',
  borderRadius: 18,
  boxShadow: '0 18px 50px rgba(31, 41, 55, 0.08)',
};

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(31, 41, 55, 0.16)',
  fontSize: 14,
  boxSizing: 'border-box',
};

const buttonStyle = {
  border: 'none',
  borderRadius: 12,
  padding: '11px 16px',
  cursor: 'pointer',
  fontWeight: 700,
};

const navLinkStyle = {
  color: '#374151',
  textDecoration: 'none',
  fontWeight: 600,
};

const noticeStyle = {
  borderRadius: 14,
  padding: '12px 14px',
  border: '1px solid rgba(245, 158, 11, 0.28)',
  background: 'rgba(255, 247, 237, 0.95)',
  color: '#92400e',
  lineHeight: 1.55,
};

const errorStyle = {
  borderRadius: 14,
  padding: '12px 14px',
  border: '1px solid rgba(239, 68, 68, 0.28)',
  background: 'rgba(254, 242, 242, 0.95)',
  color: '#b91c1c',
  lineHeight: 1.55,
};

const ctaLinkStyle = {
  ...buttonStyle,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
};

const heroSectionStyle = {
  padding: '24px 0 48px',
};

const heroBannerStyle = {
  width: '100vw',
  marginLeft: 'calc(50% - 50vw)',
  position: 'relative',
  overflow: 'hidden',
  borderBottom: '1px solid rgba(31, 41, 55, 0.08)',
};

const heroImageStyle = {
  width: '100%',
  height: 'clamp(280px, 48vw, 560px)',
  objectFit: 'cover',
  display: 'block',
  filter: 'saturate(1.03) contrast(1.02)',
};

const heroOverlayStyle = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(90deg, rgba(9, 12, 20, 0.68) 0%, rgba(9, 12, 20, 0.34) 48%, rgba(9, 12, 20, 0.08) 100%)',
};

const heroCopyStyle = {
  maxWidth: 760,
  marginTop: -72,
  position: 'relative',
  zIndex: 2,
};

const heroCardStyle = {
  ...card,
  background: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(18px)',
  padding: 24,
};

const sectionTitleStyle = {
  margin: '0 0 10px',
  fontSize: 'clamp(24px, 2.8vw, 34px)',
  letterSpacing: '-0.04em',
};

const sectionLeadStyle = {
  margin: '0 0 18px',
  color: '#6b7280',
  lineHeight: 1.7,
};

const featureGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
};

const featureCardStyle = {
  ...card,
  padding: 18,
  minHeight: 160,
};

const authPageStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 'calc(100vh - 320px)',
  padding: '48px 16px',
};

const authCardStyle = {
  ...card,
  width: '100%',
  maxWidth: 440,
  padding: '32px 28px',
  display: 'grid',
  gap: 16,
};

const authHeaderStyle = {
  textAlign: 'center',
};

const statusStyles = {
  PENDING: { background: 'rgba(245, 158, 11, 0.12)', color: '#92400e' },
  APPROVED: { background: 'rgba(16, 185, 129, 0.12)', color: '#047857' },
  REJECTED: { background: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' },
};

const statusLabels = {
  PENDING: 'Bekliyor',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
};

const requestRowStyle = {
  ...card,
  padding: 16,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
  flexWrap: 'wrap',
};

const footerStyle = {
  marginTop: 36,
  padding: '32px 0 28px',
  background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(3, 7, 18, 1) 100%)',
  color: '#e5e7eb',
  width: '100%',
};

function Reveal({ children, delay = 0, as: Component = 'div' }) {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <Component
      ref={elementRef}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 700ms ease ${delay}ms, transform 700ms ease ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </Component>
  );
}

function RuleNotice({ title, rules }) {
  return (
    <div style={noticeStyle}>
      <strong style={{ display: 'block', marginBottom: 6 }}>{title}</strong>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>
  );
}

function ErrorNotice({ message }) {
  if (!message) {
    return null;
  }

  return <div style={errorStyle}>{message}</div>;
}

function StatusBadge({ status }) {
  const style = statusStyles[status] || statusStyles.PENDING;

  return (
    <span style={{ ...style, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {statusLabels[status] || status}
    </span>
  );
}

function getFriendlyMessage(message, fallback) {
  const normalized = (message || '').toLowerCase();

  if (normalized.includes('email is required')) {
    return 'Lütfen email adresini yaz.';
  }

  if (normalized.includes('email is invalid')) {
    return 'Email adresini kontrol eder misin?';
  }

  if (normalized.includes('password is required')) {
    return 'Lütfen şifreni yaz.';
  }

  if (normalized.includes('at least 8 characters')) {
    return 'Şifren en az 8 karakter olmalı.';
  }

  if (normalized.includes('invalid credentials')) {
    return 'Email veya şifre yanlış. Tekrar deneyebilirsin.';
  }

  if (normalized.includes('already exists')) {
    return 'Bu email zaten kayıtlı. Farklı bir email ile deneyebilirsin.';
  }

  return fallback;
}

function SiteFooter() {
  return (
    <footer style={footerStyle}>
      <div style={container}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          <div>
            <h3 style={{ margin: '0 0 10px', color: '#fff' }}>Pet Adopt Vesa</h3>
            <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.7 }}>
              Sahiplendirme sürecini daha güvenli, daha şeffaf ve daha kurumsal hale getirmek için tasarlanmış bir uygulama.
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 10px', color: '#fff' }}>İletişim</h4>
            <p style={{ margin: '0 0 6px', color: '#cbd5e1' }}>Email: hello@petadoptpro.local</p>
            <p style={{ margin: '0 0 6px', color: '#cbd5e1' }}>Telefon: +90 555 010 20 30</p>
            <p style={{ margin: 0, color: '#cbd5e1' }}>Adres: İstanbul, Türkiye</p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 10px', color: '#fff' }}>Hızlı Linkler</h4>
            <p style={{ margin: '0 0 6px' }}><Link to="/" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Anasayfa</Link></p>
            <p style={{ margin: '0 0 6px' }}><Link to="/login" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Giriş Yap</Link></p>
            <p style={{ margin: 0 }}><Link to="/register" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Kayıt Ol</Link></p>
          </div>
        </div>
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(148, 163, 184, 0.18)', color: '#94a3b8', fontSize: 13 }}>
          © 2026 Pet Adopt Vesa. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}

function Page({ title, subtitle, children, action }) {
  return (
    <div style={{ padding: '28px 0 44px' }}>
      <div style={{ ...container, marginBottom: 20, display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(30px, 4vw, 46px)', letterSpacing: '-0.04em' }}>{title}</h1>
          {subtitle ? <p style={{ margin: '10px 0 0', color: '#6b7280', maxWidth: 720 }}>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div style={container}>{children}</div>
    </div>
  );
}

function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header style={{ borderBottom: '1px solid rgba(31, 41, 55, 0.08)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(18px)', position: 'sticky', top: 0, zIndex: 20, width: '100%' }}>
      <div style={{ ...container, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', gap: 16, flexWrap: 'wrap' }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#111827', fontWeight: 900, letterSpacing: '-0.04em', fontSize: 22 }}>
          Pet Adopt Vesa
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Link to="/" style={navLinkStyle}>İlanlar</Link>
          {user ? <Link to="/pets/new" style={navLinkStyle}>İlan Ekle</Link> : null}
          {user ? <Link to="/my-pets" style={navLinkStyle}>İlanlarım</Link> : null}
          {user ? <Link to="/requests" style={navLinkStyle}>Talepler</Link> : null}
          {user?.role === 'ADMIN' ? <Link to="/admin" style={navLinkStyle}>Yönetim</Link> : null}
          {!user ? <Link to="/login" style={navLinkStyle}>Giriş</Link> : null}
          {!user ? <Link to="/register" style={navLinkStyle}>Kayıt</Link> : null}
          {user ? (
            <button onClick={logout} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>
              Çıkış
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

function PetCard({ pet, onAdopt, onEdit, onDelete }) {
  return (
    <article style={{ ...card, overflow: 'hidden' }}>
      {pet.imageUrl ? (
        <img
          src={`${API_BASE}${pet.imageUrl}`}
          alt={pet.name}
          style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ height: 220, background: 'linear-gradient(135deg, #e8efe3, #f7ead6)' }} />
      )}
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
          <div>
            <h3 style={{ margin: '0 0 8px' }}>{pet.name}</h3>
            <p style={{ margin: 0, color: '#6b7280' }}>{pet.species} · {pet.city} · {pet.age} yaşında</p>
          </div>
        </div>
        <p style={{ color: '#4b5563', lineHeight: 1.55 }}>{pet.description}</p>
        {pet.user ? (
          <p style={{ fontSize: 12, color: '#6b7280' }}>İlan sahibi: {pet.user.email}</p>
        ) : null}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          {onAdopt ? (
            <button onClick={() => onAdopt(pet)} style={{ ...buttonStyle, background: '#f59e0b', color: '#111827' }}>
              İstek Gönder
            </button>
          ) : null}
          {onEdit ? (
            <button onClick={() => onEdit(pet)} style={{ ...buttonStyle, background: '#2563eb', color: '#fff' }}>
              Düzenle
            </button>
          ) : null}
          {onDelete ? (
            <button onClick={() => onDelete(pet)} style={{ ...buttonStyle, background: '#ef4444', color: '#fff' }}>
              Sil
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PetForm({ initialValues, onSubmit, submitLabel }) {
  const [form, setForm] = useState(initialValues);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData();
        data.append('name', form.name);
        data.append('species', form.species);
        data.append('age', form.age);
        data.append('city', form.city);
        data.append('description', form.description);
        if (form.image instanceof File) {
          data.append('image', form.image);
        }
        onSubmit(data);
      }}
      style={{ ...card, padding: 20, display: 'grid', gap: 14 }}
    >
      <input style={inputStyle} value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="İsim" required />
      <input style={inputStyle} value={form.species} onChange={(e) => updateField('species', e.target.value)} placeholder="Tür" required />
      <input style={inputStyle} value={form.age} onChange={(e) => updateField('age', e.target.value)} type="number" placeholder="Yaş" required />
      <input style={inputStyle} value={form.city} onChange={(e) => updateField('city', e.target.value)} placeholder="Şehir" required />
      <textarea style={{ ...inputStyle, minHeight: 120 }} value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Açıklama" required />
      <input style={inputStyle} onChange={(e) => updateField('image', e.target.files?.[0] || null)} type="file" accept="image/*" />
      <button type="submit" style={{ ...buttonStyle, background: '#111827', color: '#fff', justifySelf: 'start' }}>
        {submitLabel}
      </button>
    </form>
  );
}

function HomePage() {
  const [pets, setPets] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/pets').then((response) => setPets(response.data));
  }, []);

  const handleAdopt = async (pet) => {
    const message = window.prompt('İlan sahibine iletmek istediğin bir not var mı? (isteğe bağlı)') || undefined;
    await api.post('/adoption-requests', { petId: pet.id, message });
    window.alert('Başvurun alındı. İlan sahibi "Talepler" sayfasından görebilir.');
  };

  const handleDelete = async (pet) => {
    await api.delete(`/pets/${pet.id}`);
    setPets((current) => current.filter((item) => item.id !== pet.id));
  };

  return (
    <>
      <section style={heroSectionStyle}>
        <div style={heroBannerStyle}>
          <img src={homepageImage} alt="Pet Adopt Vesa kapak görseli" style={heroImageStyle} />
          <div style={heroOverlayStyle} />
        </div>
        <div style={{ ...container, ...heroCopyStyle }}>
          <Reveal>
            <div style={heroCardStyle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, background: 'rgba(37, 99, 235, 0.1)', color: '#1d4ed8', fontWeight: 700, fontSize: 13 }}>
                Sahiplendirme platformu
              </span>
              <h1 style={{ margin: '14px 0 12px', fontSize: 'clamp(34px, 5vw, 58px)', lineHeight: 1.02, letterSpacing: '-0.05em' }}>
                Güvenli, sade ve hızlı sahiplendirme deneyimi.
              </h1>
              <p style={{ margin: 0, color: '#4b5563', fontSize: 18, lineHeight: 1.75, maxWidth: 680 }}>
                Sahiplendirme ilanlarını tek bir yerden incele, sana uygun olanları takip et ve başvurularını kolayca ilerlet. Güvenli hesap yönetimi ve düzenli süreç akışıyla kullanımı rahat bir deneyim sunar.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22, alignItems: 'center' }}>
                {!user ? (
                  <>
                    <Link to="/register" style={{ ...ctaLinkStyle, background: '#2563eb', color: '#fff' }}>Kayıt Ol</Link>
                    <Link to="/login" style={{ ...ctaLinkStyle, background: '#111827', color: '#fff' }}>Giriş Yap</Link>
                  </>
                ) : (
                  <>
                    <Link to="/pets/new" style={{ ...ctaLinkStyle, background: '#2563eb', color: '#fff' }}>İlan Ekle</Link>
                    <Link to="/my-pets" style={{ ...ctaLinkStyle, background: '#111827', color: '#fff' }}>İlanlarım</Link>
                  </>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ padding: '10px 0 28px' }}>
        <div style={container}>
          <Reveal>
            <div>
              <h2 style={sectionTitleStyle}>Site hakkında</h2>
              <p style={sectionLeadStyle}>
                Uygulama; kullanıcıların kendi ilanlarını yönetebildiği, yöneticilerin düzeni koruyabildiği ve önemli işlemlerin kayıt altında tutulduğu bir yapı sunar.
              </p>
            </div>
          </Reveal>
          <div style={featureGridStyle}>
            {[
              {
                title: 'Güvenli erişim',
                text: 'Hesabın koruma altında tutulur ve yetkisiz erişimler engellenir.',
              },
              {
                title: 'Şeffaf süreç',
                text: 'Yapılan önemli işlemler kayıt altında tutulur ve süreç daha şeffaf ilerler.',
              },
              {
                title: 'Silme yönetimi',
                text: 'Yanlışlıkla kaldırılan içerikler tamamen kaybolmadan yönetilebilir şekilde pasife alınır.',
              },
            ].map((item, index) => (
              <Reveal key={item.title} delay={index * 120}>
                <div style={featureCardStyle}>
                  <h3 style={{ margin: '0 0 10px' }}>{item.title}</h3>
                  <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.7 }}>{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '16px 0 44px' }}>
        <div style={container}>
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
              <div>
                <h2 style={sectionTitleStyle}>Son ilanlar</h2>
                <p style={{ ...sectionLeadStyle, marginBottom: 0 }}>
                  İlanlar aşağı indikçe yumuşak bir hareketle görünür olur.
                </p>
              </div>
              {user ? <Link to="/pets/new" style={{ ...ctaLinkStyle, background: '#2563eb', color: '#fff' }}>Yeni ilan oluştur</Link> : null}
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {pets.map((pet, index) => (
              <Reveal key={pet.id} delay={index * 80}>
                <PetCard
                  pet={pet}
                  onAdopt={user && pet.user?.id !== user.id ? handleAdopt : null}
                  onEdit={user && (user.role === 'ADMIN' || pet.user?.id === user.id) ? () => navigate(`/pets/${pet.id}/edit`) : null}
                  onDelete={user && (user.role === 'ADMIN' || pet.user?.id === user.id) ? handleDelete : null}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await login(form);
      navigate(location.state?.from || '/');
    } catch (loginError) {
      setError(getFriendlyMessage(loginError.response?.data?.error, 'Giriş yapılamadı. Lütfen bilgilerini kontrol et.'));
    }
  };

  return (
    <div style={authPageStyle}>
      <div style={authCardStyle}>
        <div style={authHeaderStyle}>
          <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(26px, 4vw, 32px)', letterSpacing: '-0.04em' }}>Giriş yap</h1>
          <p style={{ margin: 0, color: '#6b7280' }}>Hesabına ulaşmak için bilgilerini gir ve devam et.</p>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 14 }}>
          <RuleNotice
            title="Giriş için dikkat etmen gerekenler"
            rules={[
              'Email alanı boş bırakılamaz.',
              'Şifre alanı boş bırakılamaz.',
              'Bilgiler yanlışsa nedenini aşağıda görebilirsin.',
            ]}
          />
          <ErrorNotice message={error} />
          <input style={inputStyle} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input style={inputStyle} type="password" placeholder="Şifre" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button style={{ ...buttonStyle, background: '#111827', color: '#fff' }} type="submit">Giriş yap</button>
        </form>
      </div>
    </div>
  );
}

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await register(form);
      navigate('/login');
    } catch (registerError) {
      setError(getFriendlyMessage(registerError.response?.data?.error, 'Kayıt oluşturulamadı. Lütfen bilgilerini kontrol et.'));
    }
  };

  return (
    <div style={authPageStyle}>
      <div style={authCardStyle}>
        <div style={authHeaderStyle}>
          <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(26px, 4vw, 32px)', letterSpacing: '-0.04em' }}>Kayıt ol</h1>
          <p style={{ margin: 0, color: '#6b7280' }}>Birkaç bilgiyle hesabını oluşturup ilana göz atmaya başlayabilirsin.</p>
        </div>
        <form onSubmit={handleRegister} style={{ display: 'grid', gap: 14 }}>
          <RuleNotice
            title="Kayıt için dikkat etmen gerekenler"
            rules={[
              'Email geçerli bir formatta olmalı.',
              'Şifre en az 8 karakter olmalı.',
              'Bilgiler eksiksiz olmalı ki hesabın sorunsuz oluşturulsun.',
            ]}
          />
          <ErrorNotice message={error} />
          <input style={inputStyle} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input style={inputStyle} type="password" placeholder="Şifre" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button style={{ ...buttonStyle, background: '#2563eb', color: '#fff' }} type="submit">Kayıt ol</button>
        </form>
      </div>
    </div>
  );
}

function PetEditorPage({ mode }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [initialValues, setInitialValues] = useState({ name: '', species: '', age: '', city: '', description: '', image: null });

  useEffect(() => {
    if (mode !== 'edit') {
      return;
    }

    api.get(`/pets/${id}`).then((response) => {
      setInitialValues({
        name: response.data.name || '',
        species: response.data.species || '',
        age: response.data.age?.toString() || '',
        city: response.data.city || '',
        description: response.data.description || '',
        image: null,
      });
    });
  }, [id, mode]);

  const submit = async (data) => {
    if (mode === 'edit') {
      await api.patch(`/pets/${id}`, data);
      navigate('/my-pets');
      return;
    }

    await api.post('/pets', data);
    navigate('/my-pets');
  };

  return (
    <Page
      title={mode === 'edit' ? 'İlanı düzenle' : 'Yeni ilan oluştur'}
      subtitle="İlan bilgilerini dilediğin zaman güncelleyebilir ve görünürlüğünü kontrol edebilirsin."
    >
      <PetForm initialValues={initialValues} onSubmit={submit} submitLabel={mode === 'edit' ? 'Güncelle' : 'Yayınla'} />
    </Page>
  );
}

function MyPetsPage() {
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);

  useEffect(() => {
    api.get('/pets/mine').then((response) => setPets(response.data));
  }, []);

  const handleDelete = async (pet) => {
    await api.delete(`/pets/${pet.id}`);
    setPets((current) => current.filter((item) => item.id !== pet.id));
  };

  return (
    <Page title="İlanlarım" subtitle="Kendi ilanlarını düzenleyebilir veya görünürlüğünü yönetebilirsin.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
        {pets.map((pet) => (
          <PetCard
            key={pet.id}
            pet={pet}
            onEdit={() => navigate(`/pets/${pet.id}/edit`)}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </Page>
  );
}

function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);

  const load = () => {
    api.get('/adoption-requests').then((response) => setRequests(response.data));
  };

  useEffect(() => {
    load();
  }, []);

  const received = requests.filter((request) => request.pet?.userId === user.id);
  const sent = requests.filter((request) => request.requesterId === user.id);

  const handleApprove = async (request) => {
    await api.patch(`/adoption-requests/${request.id}/approve`);
    load();
  };

  const handleReject = async (request) => {
    await api.patch(`/adoption-requests/${request.id}/reject`);
    load();
  };

  return (
    <Page title="Talepler" subtitle="İlanlarına gelen sahiplendirme taleplerini yönet, gönderdiğin talepleri takip et.">
      <div style={{ display: 'grid', gap: 32 }}>
        <section>
          <h2 style={{ ...sectionTitleStyle, fontSize: 22 }}>Gelen talepler</h2>
          {received.length === 0 ? (
            <p style={{ color: '#6b7280' }}>İlanlarına henüz talep gelmedi.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {received.map((request) => (
                <div key={request.id} style={requestRowStyle}>
                  <div>
                    <strong>{request.pet?.name}</strong>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>Talep eden: {request.requester?.email}</div>
                    {request.message ? <p style={{ margin: '6px 0 0', color: '#4b5563' }}>{request.message}</p> : null}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusBadge status={request.status} />
                    {request.status === 'PENDING' ? (
                      <>
                        <button onClick={() => handleApprove(request)} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>Onayla</button>
                        <button onClick={() => handleReject(request)} style={{ ...buttonStyle, background: '#ef4444', color: '#fff' }}>Reddet</button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ ...sectionTitleStyle, fontSize: 22 }}>Gönderdiğim talepler</h2>
          {sent.length === 0 ? (
            <p style={{ color: '#6b7280' }}>Henüz bir talepte bulunmadın.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {sent.map((request) => (
                <div key={request.id} style={requestRowStyle}>
                  <div>
                    <strong>{request.pet?.name}</strong>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>İlan sahibi: {request.pet?.user?.email || '—'}</div>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [pets, setPets] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/admin/users'), api.get('/admin/pets')]).then(([usersResponse, petsResponse]) => {
      setUsers(usersResponse.data);
      setPets(petsResponse.data);
    });
  }, []);

  const deactivateUser = async (userId) => {
    await api.patch(`/admin/users/${userId}/deactivate`);
    setUsers((current) => current.filter((user) => user.id !== userId));
  };

  const removePet = async (petId) => {
    await api.delete(`/pets/${petId}`);
    setPets((current) => current.filter((pet) => pet.id !== petId));
  };

  return (
    <Page title="Yönetim alanı" subtitle="Kullanıcıları ve ilanları düzenli tutmak için özel yönetim alanı.">
      <div style={{ display: 'grid', gap: 24 }}>
        <section style={{ ...card, padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Kullanıcılar</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {users.map((user) => (
              <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', borderBottom: '1px solid rgba(31,41,55,0.08)', paddingBottom: 12 }}>
                <div>
                  <strong>{user.email}</strong>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>{user.role}</div>
                </div>
                <button onClick={() => deactivateUser(user.id)} style={{ ...buttonStyle, background: '#ef4444', color: '#fff' }}>
                  Pasif hale getir
                </button>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...card, padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>İlanlar</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {pets.map((pet) => (
              <div key={pet.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', borderBottom: '1px solid rgba(31,41,55,0.08)', paddingBottom: 12 }}>
                <div>
                  <strong>{pet.name}</strong>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>{pet.species} · {pet.city}</div>
                </div>
                <button onClick={() => removePet(pet.id)} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>
                  Kaldır
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}

function AppRoutes() {
  return (
    <div style={{ ...appShell, display: 'flex', flexDirection: 'column' }}>
      <NavBar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/pets/new"
            element={
              <ProtectedRoute>
                <PetEditorPage mode="create" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pets/:id/edit"
            element={
              <ProtectedRoute>
                <PetEditorPage mode="edit" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-pets"
            element={
              <ProtectedRoute>
                <MyPetsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <AdminPage />
              </RoleRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
