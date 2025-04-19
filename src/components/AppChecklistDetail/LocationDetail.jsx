import React from 'react';
import ChecklistMapBurkup from './ChecklistMapBurkup';

function LocationDetail({ latitude, longitude, locationName, source }) {
    return (
        <div className="bg-[#1e1e1e] rounded-lg shadow-lg p-6 border border-[#444]">
            <h2 className="text-xl font-semibold mb-4 text-[#e0e0e0]">Lokasi</h2>
            <div className="mb-4">
                <ChecklistMapBurkup
                    latitude={latitude}
                    longitude={longitude}
                    locationName={locationName}
                    source={source}
                />
                <p className="text-sm text-[#b0b0b0] mt-2 text-center">
                    {locationName}
                </p>
            </div>
        </div>
    );
}

export default LocationDetail;
