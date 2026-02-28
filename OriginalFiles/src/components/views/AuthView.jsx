import React from 'react';
import { LoginForm } from '../auth/LoginForm';
import { RegisterForm } from '../auth/RegisterForm';

export const AuthView = ({
                           currentView,
                           setCurrentView,
                           loginForm,
                           setLoginForm,
                           registerForm,
                           setRegisterForm,
                           errors,
                           setErrors,
                           showPassword,
                           setShowPassword,
                           onLogin,
                           onRegister
                         }) => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/spotter-pwa-icon-512.png" alt="Spotter" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">Spotter</h1>
          <p className="text-gray-400">Track your fitness journey</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-gray-700">
            <button
                onClick={() => { setCurrentView('login'); setErrors({}); }}
                className={`flex-1 py-4 text-center font-semibold transition-all ${
                    currentView === 'login' ? 'text-white bg-gray-700/50 border-b-2 border-blue-600' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                }`}
            >
              Login
            </button>
            <button
                onClick={() => { setCurrentView('register'); setErrors({}); }}
                className={`flex-1 py-4 text-center font-semibold transition-all ${
                    currentView === 'register' ? 'text-white bg-gray-700/50 border-b-2 border-purple-600' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                }`}
            >
              Register
            </button>
          </div>

          <div className="p-8">
            {errors.general && (
                <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {errors.general}
                </div>
            )}

            {currentView === 'login' ? (
                <LoginForm
                    form={loginForm}
                    setForm={setLoginForm}
                    errors={errors}
                    onSubmit={onLogin}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                />
            ) : (
                <RegisterForm
                    form={registerForm}
                    setForm={setRegisterForm}
                    errors={errors}
                    onSubmit={onRegister}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                />
            )}
          </div>
        </div>
      </div>
    </div>
);
