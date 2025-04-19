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

    // Fungsi untuk mendapatkan nama lokasi dari koordinat
    const getLocationName = React.useCallback(async (lat, lon) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'id'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const address = data.address;
                const relevantParts = [
                    address.village,
                    address.suburb,
                    address.city_district,
                    address.city,
                    address.state
                ].filter(Boolean);

                return relevantParts.join(', ');
            }
            throw new Error('Failed to fetch location');
        } catch (error) {
            console.error('Error fetching location name:', error);
            return 'Lokasi tidak tersedia';
        }
    }, []); // Empty dependency array karena fungsi tidak bergantung pada props atau state

    // Effect untuk mendapatkan nama lokasi
    useEffect(() => {
        const latitude = checklistData?.checklist?.latitude;
        const longitude = checklistData?.checklist?.longitude;

        if (!latitude || !longitude) return;

        let isMounted = true;

        const fetchLocation = async () => {
            const name = await getLocationName(latitude, longitude);
            if (isMounted) {
                setLocationName(name);
            }
        };

        fetchLocation();

        return () => {
            isMounted = false;
        };
    }, [checklistData?.checklist?.id, getLocationName]); // Menggunakan ID sebagai dependency

    const handleImageClick = (image, faunaImages) => {
        const globalIndex = allSpeciesImages.findIndex(img => img.id === image.id);
        setSelectedImage(allSpeciesImages[globalIndex]);
        setCurrentImageIndex(globalIndex);
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

    // Jika tidak ada data fauna, tampilkan pesan
    if (!checklistData?.fauna?.length) {
        return (
            <div className="p-4 text-center text-[#b0b0b0]">
                Tidak ada data spesies yang tersedia
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <table className="min-w-full bg-[#1e1e1e] border border-[#444]">
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
                                        {/* Species Info */}
                                        <div>
                                            <div className="font-medium text-[#e0e0e0]">{fauna.nama_lokal || 'Tidak ada nama'}</div>
                                            <div className="text-sm text-[#b0b0b0] italic">{fauna.nama_ilmiah}</div>
                                        </div>

                                        {/* Images */}
                                        {faunaImages?.length > 0 && (
                                            <div className="flex space-x-2">
                                                {faunaImages.map(image => (
                                                    <div
                                                        key={`image-${image.id}`}
                                                        className="w-16 h-16 cursor-pointer border border-[#444] rounded overflow-hidden"
                                                        onClick={() => handleImageClick(image, faunaImages)}
                                                    >
                                                        <img
                                                            src={image.url}
                                                            alt="Thumbnail"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Sounds */}
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
                                                        <audio controls className="w-48 h-8 bg-[#2c2c2c]">
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
                                <td className="px-4 py-2 text-center text-sm text-[#e0e0e0]">{fauna.catatan || 'Tidak'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Image Viewer */}
            {showImageModal && selectedImage && (
                <div className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex items-center justify-center"
                     onClick={() => setShowImageModal(false)}>
                    {/* Navigation Arrows */}
                    <button
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#e0e0e0] hover:text-[#b0b0b0]"
                        onClick={handlePrevImage}
                        disabled={currentImageIndex === 0}
                    >
                        <ChevronLeftIcon className="w-8 h-8" />
                    </button>

                    <button
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#e0e0e0] hover:text-[#b0b0b0]"
                        onClick={handleNextImage}
                        disabled={currentImageIndex === allSpeciesImages.length - 1}
                    >
                        <ChevronRightIcon className="w-8 h-8" />
                    </button>

                    {/* Close Button */}
                    <button
                        className="absolute top-4 right-4 text-[#e0e0e0] hover:text-[#b0b0b0]"
                        onClick={() => setShowImageModal(false)}
                    >
                        <XMarkIcon className="w-8 h-8" />
                    </button>

                    {/* Main Content */}
                    <div className="w-full h-full flex flex-col"
                         onClick={e => e.stopPropagation()}>
                        {/* Image Container */}
                        <div className="flex-1 flex items-center justify-center p-4">
                            <img
                                src={selectedImage.url}
                                alt="Foto pengamatan"
                                className="max-w-full max-h-[80vh] object-contain"
                            />
                        </div>

                        {/* Image Info Footer */}
                        <div className="bg-[#1e1e1e] bg-opacity-90 text-[#e0e0e0] p-4">
                            <div className="container mx-auto">
                                <div className="flex items-start space-x-3">
                                    {/* Image Details */}
                                    <div className="flex-1">
                                        <h3 className="font-medium">
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

                                    {/* Counter */}
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
