import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

import { auth } from "../firebase/config";
import { createUserProfile } from "../services/userService";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.email || !form.password) {
      alert("Preencha e-mail e senha");
      return;
    }

    try {
      setLoading(true);

      let userCredential;

      if (isRegister) {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          form.email,
          form.password
        );

        await createUserProfile(userCredential.user);

        alert("Conta criada com sucesso!");
      } else {
        userCredential = await signInWithEmailAndPassword(
          auth,
          form.email,
          form.password
        );

        await createUserProfile(userCredential.user);

        alert("Login realizado com sucesso!");
      }

      navigate("/dashboard");
    } catch (error) {
      console.error(error);

      if (error.code === "auth/email-already-in-use") {
        alert("Este e-mail já está em uso.");
      } else if (error.code === "auth/invalid-credential") {
        alert("E-mail ou senha inválidos.");
      } else if (error.code === "auth/weak-password") {
        alert("A senha deve ter pelo menos 6 caracteres.");
      } else {
        alert("Erro ao autenticar.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14091f] via-[#1b1028] to-[#2a1242] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">
            Flluxo
          </h1>

          <p className="text-slate-500 mt-3">
            Gestão empresarial inteligente
          </p>
        </div>

        <h2 className="text-2xl font-bold text-[#1b1028] mb-6">
          {isRegister ? "Criar conta" : "Entrar"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              E-mail
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-purple-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-fuchsia-500"
              placeholder="Digite seu e-mail"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Senha
            </label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border border-purple-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-fuchsia-500"
              placeholder="Digite sua senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white py-4 rounded-xl font-semibold transition shadow-lg disabled:opacity-50"
          >
            {loading
              ? "Carregando..."
              : isRegister
              ? "Criar conta"
              : "Entrar"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-5 text-fuchsia-600 font-medium hover:text-fuchsia-700 transition"
        >
          {isRegister
            ? "Já possui conta? Entrar"
            : "Criar nova conta"}
        </button>
      </div>
    </div>
  );
}

export default Login;