import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../utils/api';
import EditChecklistModal from './EditChecklistModal';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import MediaViewer from './MediaViewer';
import ChecklistMapBurkup from './ChecklistMapBurkup';
import TaxonomyDetail from './TaxonomyDetail';
import LocationDetail from './LocationDetail';

function AppChecklistDetail() {
    const { id } = useParams();
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [locationName, setLocationName] = useState('Memuat lokasi...');
    const queryClient = useQueryClient();

    // Tentukan source dan endpoint berdasarkan prefix ID
    const source = id.startsWith('BN') ? 'burungnesia' :
                  id.startsWith('KP') ? 'kupunesia' : 'fobi';

    const endpoint = (() => {
        if (source === 'burungnesia') {
            return `/burungnesia/checklists/${id.substring(2)}`;
        } else if (source === 'kupunesia') {
            return `/kupunesia/checklists/${id.substring(2)}`;
        }
        return null;
    })();

    // Query untuk mengambil data checklist
    const { data: checklistData, isLoading, error } = useQuery({
        queryKey: ['checklist', id],
        queryFn: async () => {
            if (!endpoint) {
                throw new Error('ID checklist tidak valid');
            }
            const response = await apiFetch(endpoint);
            if (!response.ok) {
                throw new Error('Gagal memuat data checklist');
            }
            return response.json();
        },
        enabled: !!endpoint
    });

    // Fungsi untuk mendapatkan nama lokasi
    const getLocationName = async (latitude, longitude) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            return data.display_name;
        } catch (error) {
            console.error('Error fetching location name:', error);
            return 'Gagal memuat nama lokasi';
        }
    };

    useEffect(() => {
        if (checklistData?.data?.checklist?.latitude && checklistData?.data?.checklist?.longitude) {
            getLocationName(
                checklistData.data.checklist.latitude,
                checklistData.data.checklist.longitude
            ).then(name => setLocationName(name));
        }
    }, [checklistData]);

    const handleUpdateSuccess = async () => {
        await queryClient.invalidateQueries(['checklist', id]);
        setShowEditModal(false);
    };

    if (!source) {
        return <div className="text-red-400 text-center p-4 bg-[#121212]">Error: Format ID tidak valid</div>;
    }

    if (isLoading) {
        return <div className="text-[#e0e0e0] text-center p-4 bg-[#121212]">Memuat...</div>;
    }

    if (error) {
        return <div className="text-red-400 text-center p-4 bg-[#121212]">Error: {error.message}</div>;
    }

    const { checklist, fauna, media } = checklistData.data;

    return (
        <div className="container mx-auto px-4 py-8 mt-10 bg-[#121212] text-[#e0e0e0]">
            <div className="bg-[#1e1e1e] rounded-lg shadow p-6 mb-6 border border-[#444]">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-[#e0e0e0]">Detail Checklist</h1>
                    {checklist.can_edit && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="p-2 text-[#1a73e8] hover:bg-[#2c2c2c] rounded-full"
                                title="Edit Checklist"
                            >
                                <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="p-2 text-red-400 hover:bg-[#2c2c2c] rounded-full"
                                title="Hapus Checklist"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Map Section */}
                <div className="mb-6">
                    <ChecklistMapBurkup
                        latitude={checklist.latitude}
                        longitude={checklist.longitude}
                        locationName={locationName}
                        source={source}
                    />
                    <p className="text-sm text-[#b0b0b0] mt-2 text-center">
                        {locationName}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Informasi Dasar */}
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-[#e0e0e0]">Informasi Dasar</h2>
                        <div className="space-y-2">
                            <p><span className="font-medium text-[#e0e0e0]">Observer:</span> <span className="text-[#b0b0b0]">{checklist.observer}</span></p>
                            <p><span className="font-medium text-[#e0e0e0]">Username:</span> <span className="text-[#b0b0b0]">{checklist.username}</span></p>
                            <p><span className="font-medium text-[#e0e0e0]">Tanggal:</span> <span className="text-[#b0b0b0]">{checklist.tgl_pengamatan}</span></p>
                            <p><span className="font-medium text-[#e0e0e0]">Waktu:</span> <span className="text-[#b0b0b0]">{checklist.start_time} - {checklist.end_time}</span></p>
                            <p><span className="font-medium text-[#e0e0e0]">Koordinat:</span> <span className="text-[#b0b0b0]">{checklist.latitude}, {checklist.longitude}</span></p>
                            <p><span className="font-medium text-[#e0e0e0]">Total Observasi:</span> <span className="text-[#b0b0b0]">{checklist.total_observations}</span></p>
                        </div>
                    </div>

                    {/* Daftar Fauna */}
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-[#e0e0e0]">Daftar Fauna</h2>
                        <div className="space-y-4">
                            {fauna.map((f) => (
                                <div key={f.id} className="border border-[#444] p-3 rounded bg-[#2c2c2c]">
                                    <p className="font-medium text-[#e0e0e0]">{f.nama_lokal}</p>
                                    <p className="text-[#b0b0b0] italic">{f.nama_ilmiah}</p>
                                    <p className="text-sm text-[#b0b0b0]">Family: {f.family}</p>
                                    <p className="text-[#e0e0e0]">Jumlah: <span className="text-[#b0b0b0]">{f.jumlah}</span></p>
                                    <p className="text-[#e0e0e0]">Catatan: <span className="text-[#b0b0b0]">{f.catatan || '-'}</span></p>
                                    {f.breeding && (
                                        <div className="mt-2">
                                            <p className="text-green-400">Breeding</p>
                                            <p className="text-[#b0b0b0]">{f.breeding_note || '-'}</p>
                                            {source === 'kupunesia' && f.breeding_type_name && (
                                                <p className="text-sm text-[#b0b0b0]">Tipe: {f.breeding_type_name}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Catatan Tambahan */}
                {checklist.additional_note && (
                    <div className="mt-6">
                        <h2 className="text-lg font-semibold mb-2 text-[#e0e0e0]">Catatan Tambahan</h2>
                        <p className="text-[#b0b0b0]">{checklist.additional_note}</p>
                    </div>
                )}

                {/* Media Section */}
                {media.images.length > 0 && (
                    <div className="mt-6">
                        <h2 className="text-lg font-semibold mb-2 text-[#e0e0e0]">Foto</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {media.images.map((img) => (
                                <div key={img.id} className="relative">
                                    <img
                                        src={img.url}
                                        alt="Foto pengamatan"
                                        className="w-full h-48 object-cover rounded border border-[#444]"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Edit */}
            {showEditModal && checklist.can_edit && (
                <EditChecklistModal
                    checklist={checklist}
                    fauna={fauna}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={handleUpdateSuccess}
                    source={source}
                />
            )}
        </div>
    );
}

export default AppChecklistDetail;
