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

  const [isRegister, setIsRegister] =
    useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] =
    useState(false);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (
      !form.email ||
      !form.password
    ) {
      alert(
        "Preencha e-mail e senha"
      );
      return;
    }

    try {
      setLoading(true);

      let userCredential;

      if (isRegister) {
        userCredential =
          await createUserWithEmailAndPassword(
            auth,
            form.email,
            form.password
          );

        await createUserProfile(
          userCredential.user
        );

        alert(
          "Conta criada com sucesso!"
        );
      } else {
        userCredential =
          await signInWithEmailAndPassword(
            auth,
            form.email,
            form.password
          );

        await createUserProfile(
          userCredential.user
        );

        alert(
          "Login realizado com sucesso!"
        );
      }

      navigate("/dashboard");
    } catch (error) {
      console.error(error);

      if (
        error.code ===
        "auth/email-already-in-use"
      ) {
        alert(
          "Este e-mail já está em uso."
        );
      } else if (
        error.code ===
        "auth/invalid-credential"
      ) {
        alert(
          "E-mail ou senha inválidos."
        );
      } else if (
        error.code ===
        "auth/weak-password"
      ) {
        alert(
          "A senha deve ter pelo menos 6 caracteres."
        );
      } else {
        alert(
          "Erro ao autenticar."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14091f] via-[#1b1028] to-[#2a1242] flex items-center justify-center p-6 overflow-hidden relative">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-[-120px] left-[-120px] w-[400px] h-[400px] bg-fuchsia-600 rounded-full blur-3xl" />

        <div className="absolute bottom-[-140px] right-[-120px] w-[450px] h-[450px] bg-purple-700 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-gradient-to-br from-[#241136]/95 via-[#2b1242]/95 to-[#1b1028]/95 backdrop-blur-xl rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.45)] p-8 border border-fuchsia-500/20">
        <div className="text-center mb-8">
          <img
            src="/logo-flluxo.png"
            alt="Flluxo"
            className="w-52 mx-auto drop-shadow-xl"
          />

          <p className="text-purple-200 mt-4 text-sm">
            Soluções Integradas de Gestão
          </p>
        </div>

        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {isRegister
            ? "Criar conta"
            : "Entrar no sistema"}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-purple-100 mb-2">
              E-mail
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full bg-white/10 text-white placeholder:text-purple-200 border border-fuchsia-400/20 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-fuchsia-500 transition"
              placeholder="Digite seu e-mail"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-100 mb-2">
              Senha
            </label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full bg-white/10 text-white placeholder:text-purple-200 border border-fuchsia-400/20 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-fuchsia-500 transition"
              placeholder="Digite sua senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-700 hover:opacity-95 text-white py-4 rounded-2xl font-semibold transition shadow-xl disabled:opacity-50"
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
          onClick={() =>
            setIsRegister(
              !isRegister
            )
          }
          className="w-full mt-5 text-fuchsia-300 font-medium hover:text-fuchsia-200 transition"
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