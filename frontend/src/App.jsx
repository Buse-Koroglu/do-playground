import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import api from "./api";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace("/api", "");

const List = () => {
  const [animals, setAnimals] = useState([]);
  useEffect(() => {
    api.get("/animals").then((res) => setAnimals(res.data));
  }, []);
  return (
    <div>
      <h2>İlanlar</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "10px",
        }}
      >
        {animals.map((a) => (
          <div key={a.id} style={{ border: "1px solid #ccc", padding: "10px" }}>
            {a.imageUrl && (
              <img src={`${API_BASE}${a.imageUrl}`} width="100%" alt={a.name} />
            )}
            <h3>
              {a.name} ({a.species})
            </h3>
            <p>
              {a.city} - {a.age} Yaşında
            </p>
            <p>{a.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const Add = () => {
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await api.post("/animals", formData);
    navigate("/");
  };
  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="İsim" required />
      <br />
      <input name="species" placeholder="Tür" required />
      <br />
      <input name="age" type="number" placeholder="Yaş" required />
      <br />
      <input name="city" placeholder="Şehir" required />
      <br />
      <textarea name="description" placeholder="Açıklama" />
      <br />
      <input name="image" type="file" />
      <br />
      <button type="submit">Ekle</button>
    </form>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await api.post("/login", form);
    localStorage.setItem("token", res.data.token);
    navigate("/");
  };
  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <br />
      <input
        type="password"
        placeholder="Şifre"
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <br />
      <button type="submit">Giriş</button>
    </form>
  );
};

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const handleRegister = async (e) => {
    e.preventDefault();
    await api.post("/register", form);
    navigate("/login");
  };
  return (
    <form onSubmit={handleRegister}>
      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <br />
      <input
        type="password"
        placeholder="Şifre"
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <br />
      <button type="submit">Kayıt Ol</button>
    </form>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ marginBottom: "20px" }}>
        <Link to="/">İlanlar</Link> | <Link to="/add">İlan Ekle</Link> |{" "}
        <Link to="/login">Giriş</Link> | <Link to="/register">Kayıt</Link>
      </nav>
      <Routes>
        <Route path="/" element={<List />} />
        <Route path="/add" element={<Add />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}
