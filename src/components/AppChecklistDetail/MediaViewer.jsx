import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';

function MediaViewer({ checklistData, images = [], sounds = [] }) {
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [allSpeciesImages, setAllSpeciesImages] = useState([]);
    const [locationName, setLocationName] = useState('');

    // Memoize groupedMedia untuk mencegah re-render yang tidak perlu
    const groupedMedia = React.useMemo(() => {
        return (checklistData?.fauna || []).reduce((acc, fauna) => {
            acc[fauna.id] = {
                fauna,
                images: images.filter(img => img.fauna_id === fauna.id),
                sounds: sounds.filter(sound => sound.fauna_id === fauna.id)
            };
            return acc;
        }, {});
    }, [checklistData?.fauna, images, sounds]);

    // Set allSpeciesImages hanya ketika groupedMedia berubah
    useEffect(() => {
        const allImages = Object.values(groupedMedia).reduce((acc, { fauna, images }) => {
            return [...acc, ...images.map(img => ({ ...img, fauna }))];
        }, []);
        setAllSpeciesImages(allImages);
    }, [groupedMedia]);

    // Fungsi untuk mendapatkan nama lokasi
    const getLocationName = React.useCallback(async (lat, lon) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'id' } }
            );
            if (response.ok) {
                const data = await response.json();
                const address = data.address;
                return [
                    address.village,
                    address.suburb,
                    address.city_district,
                    address.city,
                    address.state
                ].filter(Boolean).join(', ');
            }
            throw new Error('Failed to fetch location');
        } catch (error) {
            console.error('Error fetching location name:', error);
            return 'Lokasi tidak tersedia';
        }
    }, []);

    // Effect untuk mendapatkan nama lokasi
    useEffect(() => {
        if (checklistData?.checklist?.latitude && checklistData?.checklist?.longitude) {
            getLocationName(
                checklistData.checklist.latitude,
                checklistData.checklist.longitude
            ).then(setLocationName);
        }
    }, [checklistData?.checklist?.id, getLocationName]);

    // Handler untuk gambar
    const handleImageClick = (image) => {
        const index = allSpeciesImages.findIndex(img => img.id === image.id);
        setSelectedImage(allSpeciesImages[index]);
        setCurrentImageIndex(index);
        setShowImageModal(true);
    };

    const handlePrevImage = (e) => {
        e.stopPropagation();
        if (currentImageIndex > 0) {
            setCurrentImageIndex(prev => prev - 1);
            setSelectedImage(allSpeciesImages[currentImageIndex - 1]);
        }
    };

    const handleNextImage = (e) => {
        e.stopPropagation();
        if (currentImageIndex < allSpeciesImages.length - 1) {
            setCurrentImageIndex(prev => prev + 1);
            setSelectedImage(allSpeciesImages[currentImageIndex + 1]);
        }
    };

    // Render komponen
    return (
        <div className="space-y-4">
            {/* Table view */}
            <div className="overflow-x-auto">
                <table className="min-w-full bg-[#1e1e1e] border border-[#444] rounded-lg">
                    <thead className="bg-[#2c2c2c]">
                        <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-[#e0e0e0]">Spesies</th>
                            <th className="px-4 py-2 text-center text-sm font-medium text-[#e0e0e0]">Jumlah</th>
                            <th className="px-4 py-2 text-center text-sm font-medium text-[#e0e0e0]">Catatan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#444]">
                        {Object.values(groupedMedia).map(({ fauna, images: faunaImages, sounds: faunaSounds }) => (
                            <tr key={`fauna-${fauna.id}`} className="hover:bg-[#2c2c2c]">
                                <td className="px-4 py-2">
                                    <div className="space-y-3">
                                        <div>
                                            <div className="font-medium text-[#e0e0e0]">{fauna.nama_lokal || 'Tidak ada nama'}</div>
                                            <div className="text-sm text-[#b0b0b0] italic">{fauna.nama_ilmiah}</div>
                                        </div>
                                        {faunaImages?.length > 0 && (
                                            <div className="flex space-x-2">
                                                {faunaImages.map(image => (
                                                    <div
                                                        key={`image-${image.id}`}
                                                        className="w-16 h-16 cursor-pointer border border-[#444] rounded hover:border-[#1a73e8]"
                                                        onClick={() => handleImageClick(image)}
                                                    >
                                                        <img
                                                            src={image.url}
                                                            alt="Thumbnail"
                                                            className="w-full h-full object-cover rounded"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {faunaSounds?.length > 0 && (
                                            <div className="flex space-x-2">
                                                {faunaSounds.map(sound => (
                                                    <div key={`sound-${sound.id}`} className="space-y-1">
                                                        {sound.spectrogram && (
                                                            <img
                                                                src={sound.spectrogram}
                                                                alt="Spectrogram"
                                                                className="w-16 h-16 object-cover rounded border border-[#444]"
                                                            />
                                                        )}
                                                        <audio controls className="w-48 h-8 bg-[#2c2c2c] text-[#e0e0e0]">
                                                            <source src={sound.url} type="audio/mpeg" />
                                                            Browser Anda tidak mendukung pemutaran audio.
                                                        </audio>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-2 text-center text-sm text-[#e0e0e0]">{fauna.jumlah || 1}</td>
                                <td className="px-4 py-2 text-center text-sm text-[#e0e0e0]">{fauna.catatan || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Image Modal */}
            {showImageModal && selectedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex items-center justify-center"
                    onClick={() => setShowImageModal(false)}
                >
                    <button
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                        onClick={handlePrevImage}
                        disabled={currentImageIndex === 0}
                    >
                        <ChevronLeftIcon className="w-8 h-8" />
                    </button>
                    <button
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                        onClick={handleNextImage}
                        disabled={currentImageIndex === allSpeciesImages.length - 1}
                    >
                        <ChevronRightIcon className="w-8 h-8" />
                    </button>
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                        onClick={() => setShowImageModal(false)}
                    >
                        <XMarkIcon className="w-8 h-8" />
                    </button>

                    <div
                        className="w-full h-full flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex-1 flex items-center justify-center p-4">
                            <img
                                src={selectedImage.url}
                                alt="Foto pengamatan"
                                className="max-w-full max-h-[80vh] object-contain"
                            />
                        </div>
                        <div className="bg-[#121212] bg-opacity-90 text-white p-4 border-t border-[#444]">
                            <div className="container mx-auto">
                                <div className="flex items-start space-x-3">
                                    <div className="flex-1">
                                        <h3 className="font-medium text-[#e0e0e0]">
                                            {selectedImage.fauna?.nama_lokal || 'Nama spesies'}
                                            <span className="ml-2 text-sm font-normal italic text-[#b0b0b0]">
                                                {selectedImage.fauna?.nama_ilmiah}
                                            </span>
                                        </h3>
                                        <div className="text-sm text-[#b0b0b0] flex items-center mt-1">
                                            <MapPinIcon className="w-4 h-4 mr-1" />
                                            {locationName || 'Memuat lokasi...'}
                                        </div>
                                    </div>
                                    <div className="text-sm text-[#b0b0b0]">
                                        {currentImageIndex + 1} / {allSpeciesImages.length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MediaViewer;
