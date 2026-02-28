import React from 'react';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { InputField } from '../ui/InputField';

export const RegisterForm = ({ form, setForm, errors, onSubmit, showPassword, setShowPassword }) => {
    const handleKeyPress = (e) => e.key === 'Enter' && onSubmit();

    return (
        <div className="space-y-6">
            <InputField
                label="Username"
                icon={User}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                onKeyPress={handleKeyPress}
                placeholder="johndoe"
                error={errors.username}
            />

            <InputField
                label="Email Address"
                icon={Mail}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onKeyPress={handleKeyPress}
                placeholder="you@example.com"
                error={errors.email}
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
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-11 pr-11 py-3 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
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

            <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Confirm Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        onKeyPress={handleKeyPress}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                        placeholder="••••••••"
                    />
                </div>
                {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>

            <button
                onClick={onSubmit}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
                Create Account
            </button>
        </div>
    );
};