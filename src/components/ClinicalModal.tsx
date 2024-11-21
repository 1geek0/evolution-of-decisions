import { useEffect, useState } from 'react';

interface ClinicalModalProps {
    isOpen: boolean;
    onClose: () => void;
    demographics: {
        age: number;
        gender: string;
        occupation: {
            knowledge_worker: boolean;
            knowledge_worker_profession: string | null;
            olfactory_profession: string | null;
            stage_artist: boolean;
        };
    };
    clinicalData: {
        presenting_symptoms: string[] | string;
        medical_history: string[] | string;
    };
    clinicalNotes: {
        aggressive: string;
        conservative: string;
    };
}

export default function ClinicalModal({ isOpen, onClose, demographics, clinicalData, clinicalNotes }: ClinicalModalProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'aggressive' | 'conservative'>('info');

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const formatList = (items: string[] | string) => {
        if (Array.isArray(items)) {
            return items.map((item, i) => <li key={i} className="mb-1">{item}</li>);
        }
        return <li>{items}</li>;
    };

    const formatNotes = (notes: string) => {
        return notes.split('\n').map((line, i) => {
            const isHeader = line.toUpperCase() === line && line.length > 0;
            const isSubheader = line.endsWith(':');

            return (
                <p key={i} className={`
                    mb-3
                    ${isHeader ? 'text-lg font-bold mt-6 text-gray-700 dark:text-gray-300' : ''}
                    ${isSubheader ? 'font-semibold text-gray-600 dark:text-gray-400 mt-4' : ''}
                    ${!isHeader && !isSubheader ? 'ml-4' : ''}
                `}>
                    {line}
                </p>
            );
        });
    };

    const scrollToTop = () => {
        const container = document.querySelector('.p-6.overflow-y-auto');
        if (container) {
            container.scrollTop = 0;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col font-inter">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Clinical Information</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>

                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex">
                        <button
                            onClick={() => { setActiveTab('info'); scrollToTop(); }}
                            className={`px-4 py-2 font-medium text-sm ${activeTab === 'info'
                                ? 'border-b-2 border-blue-500 text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Patient Info
                        </button>
                        <button
                            onClick={() => { setActiveTab('aggressive'); scrollToTop(); }}
                            className={`px-4 py-2 font-medium text-sm ${activeTab === 'aggressive'
                                ? 'border-b-2 border-red-500 text-red-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Aggressive Treatment
                        </button>
                        <button
                            onClick={() => { setActiveTab('conservative'); scrollToTop(); }}
                            className={`px-4 py-2 font-medium text-sm ${activeTab === 'conservative'
                                ? 'border-b-2 border-blue-500 text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Conservative Treatment
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto">
                    {activeTab === 'info' && (
                        <div className="space-y-6 font-inter">
                            <section>
                                <h4 className="font-medium mb-2 text-blue-600 dark:text-blue-400">Demographics</h4>
                                <div className="space-y-2">
                                    <p><span className="font-medium">Age:</span> {demographics.age}</p>
                                    <p><span className="font-medium">Gender:</span> {demographics.gender}</p>
                                    <p><span className="font-medium">Occupation:</span> {
                                        demographics.occupation.knowledge_worker_profession ||
                                        demographics.occupation.olfactory_profession ||
                                        (demographics.occupation.stage_artist ? 'Stage Artist' : 'Not specified')
                                    }</p>
                                </div>
                            </section>

                            <section>
                                <h4 className="font-medium mb-2 text-blue-600 dark:text-blue-400">Presenting Symptoms</h4>
                                <ul className="list-disc list-inside">
                                    {formatList(clinicalData.presenting_symptoms)}
                                </ul>
                            </section>

                            <section>
                                <h4 className="font-medium mb-2 text-blue-600 dark:text-blue-400">Medical History</h4>
                                <ul className="list-disc list-inside">
                                    {formatList(clinicalData.medical_history)}
                                </ul>
                            </section>
                        </div>
                    )}

                    {activeTab === 'aggressive' && (
                        <div className="prose dark:prose-invert max-w-none space-y-1 font-inter">
                            {formatNotes(clinicalNotes.aggressive)}
                        </div>
                    )}

                    {activeTab === 'conservative' && (
                        <div className="prose dark:prose-invert max-w-none space-y-1 font-inter">
                            {formatNotes(clinicalNotes.conservative)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 