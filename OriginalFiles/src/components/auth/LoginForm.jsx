import React from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { InputField } from '../ui/InputField';

export const LoginForm = ({ form, setForm, errors, onSubmit, showPassword, setShowPassword }) => {
    const handleKeyPress = (e) => e.key === 'Enter' && onSubmit();

    return (
        <div className="space-y-6">
            <InputField
                label="Username or Email"
                icon={Mail}
                type="text"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                onKeyPress={handleKeyPress}
                placeholder="username or you@example.com"
                error={errors.identifier}
            />

            <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        onKeyPress={handleKeyPress}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-11 pr-11 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        placeholder="••••••••"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
            </div>

            <button
                onClick={onSubmit}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
                Sign In
            </button>

            <p className="text-center text-gray-400 text-sm mt-4">
                Try logging in with username or email
            </p>
        </div>
    );
};