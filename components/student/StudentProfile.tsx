import React, { useEffect, useMemo, useState } from 'react';
import { User, Mail, Phone, Save, Camera } from 'lucide-react';
import { Button } from '../ui/Button';
import { Profile } from '../../types';

interface StudentProfileProps {
    profile: Profile | null;
    onUpdateProfile: (updates: Partial<Profile>) => Promise<boolean>;
    updatingProfile: boolean;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ profile, onUpdateProfile, updatingProfile }) => {
    const [formState, setFormState] = useState({
        name: profile?.name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        parent_name: profile?.parent_name || '',
        parent_contact: profile?.parent_contact || ''
    });

    useEffect(() => {
        setFormState({
            name: profile?.name || '',
            email: profile?.email || '',
            phone: profile?.phone || '',
            parent_name: profile?.parent_name || '',
            parent_contact: profile?.parent_contact || ''
        });
    }, [profile]);

    const initials = useMemo(() => {
        if (!formState.name) {
            return profile?.email?.charAt(0)?.toUpperCase() || 'S';
        }
        return formState.name
            .split(' ')
            .map(part => part[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }, [formState.name, profile?.email]);

    const handleChange = (field: keyof typeof formState) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormState(prev => ({ ...prev, [field]: event.target.value }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await onUpdateProfile({
            name: formState.name,
            email: formState.email,
            phone: formState.phone,
            parent_name: formState.parent_name,
            parent_contact: formState.parent_contact
        });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
                <User className="text-gray-600" /> My Profile
            </h1>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center h-fit">
                    <div className="relative w-32 h-32 mx-auto mb-4 group cursor-pointer">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/40 flex items-center justify-center text-3xl font-bold text-dark select-none">
                            {initials}
                        </div>
                        <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white" size={24} />
                        </div>
                    </div>
                    <h3 className="font-bold text-xl text-dark">{formState.name || 'Add your name'}</h3>
                    <p className="text-gray-500 text-sm mb-4">{profile?.role === 'student' ? 'Student' : 'Member'}</p>
                    <div className="text-left bg-gray-50 p-4 rounded-xl">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Parent Contact</p>
                        <p className="text-sm font-medium text-dark flex items-center gap-2">
                            <User size={14} /> {formState.parent_name || 'Add guardian name'}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            <Phone size={14} /> {formState.parent_contact || 'Add guardian phone'}
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-dark text-lg mb-6 pb-2 border-b border-gray-100">Personal Information</h3>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                            <input
                                type="text"
                                value={formState.name}
                                onChange={handleChange('name')}
                                className="w-full mt-1 border border-gray-200 rounded-lg p-3 text-sm focus:border-primary outline-none"
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    value={formState.email}
                                    onChange={handleChange('email')}
                                    className="w-full mt-1 border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:border-primary outline-none"
                                    placeholder="student@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="tel"
                                    value={formState.phone}
                                    onChange={handleChange('phone')}
                                    className="w-full mt-1 border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:border-primary outline-none"
                                    placeholder="WhatsApp number"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Parent / Guardian Name</label>
                                <input
                                    type="text"
                                    value={formState.parent_name}
                                    onChange={handleChange('parent_name')}
                                    className="w-full mt-1 border border-gray-200 rounded-lg p-3 text-sm focus:border-primary outline-none"
                                    placeholder="Who should we contact?"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Parent Contact</label>
                                <input
                                    type="tel"
                                    value={formState.parent_contact}
                                    onChange={handleChange('parent_contact')}
                                    className="w-full mt-1 border border-gray-200 rounded-lg p-3 text-sm focus:border-primary outline-none"
                                    placeholder="Guardian phone number"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button className="gap-2" disabled={updatingProfile}>
                                <Save size={18} />
                                {updatingProfile ? 'Saving…' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};