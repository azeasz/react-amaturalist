import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faComments,
    faSearch,
    faCheckCircle,
    faMapMarkerAlt,
    faPaw,
    faXmark
} from '@fortawesome/free-solid-svg-icons';
import 'react-quill/dist/quill.snow.css';
import { apiFetch } from '../../utils/api';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';

// CSS untuk ReactQuill dark theme
import './quill-dark.css';

const getSourceFromId = (id) => {
    if (!id) return 'fobi';
    return typeof id === 'string' && (
        id.startsWith('BN') ? 'burungnesia' :
        id.startsWith('KP') ? 'kupunesia' :
        'fobi'
    );
};

function TabPanel({
    id,
    activeTab,
    setActiveTab,
    comments,
    setComments,
    identifications,
    setIdentifications,
    newComment,
    setNewComment,
    addComment,
    handleIdentificationSubmit,
    searchTaxa,
    searchResults,
    selectedTaxon,
    setSelectedTaxon,
    identificationForm,
    setIdentificationForm,
    handleAgreeWithIdentification,
    handleWithdrawIdentification,
    handleCancelAgreement,
    handleDisagreeWithIdentification,
    user,
    checklist
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showDisagreeModal, setShowDisagreeModal] = useState(false);
    const [disagreeComment, setDisagreeComment] = useState('');
    const [selectedIdentificationId, setSelectedIdentificationId] = useState(null);
    const [identificationPhoto, setIdentificationPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [showIdentifierTooltip, setShowIdentifierTooltip] = useState(false);
    const [activeIdentifierId, setActiveIdentifierId] = useState(null);
    const [showAgreementTooltip, setShowAgreementTooltip] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [selectedUsername, setSelectedUsername] = useState(null);
    const source = getSourceFromId(id);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionsRef] = useState(React.createRef());
    const [modalSuggestionsRef] = useState(React.createRef());
    const [wsConnected, setWsConnected] = useState(false);
    const ws = useRef(null);
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flagReason, setFlagReason] = useState('');
    const [selectedCommentId, setSelectedCommentId] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // For main suggestions
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            // For modal suggestions
            if (modalSuggestionsRef.current && !modalSuggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Fungsi untuk mengambil data terbaru
        const fetchLatestData = async () => {
            try {
                // Ambil komentar terbaru saja
                const commentsResponse = await apiFetch(`/observations/${id}/comments`);
                const commentsData = await commentsResponse.json();
                if (commentsData.success) {
                    setComments(commentsData.data);
                }
            } catch (error) {
                console.error('Error fetching latest data:', error);
            }
        };

        // Set interval untuk polling setiap 2 menit
        const intervalId = setInterval(fetchLatestData, 120000); // 120000 ms = 2 menit

        // Panggil fetchLatestData sekali saat komponen dimount
        fetchLatestData();

        // Cleanup interval saat komponen unmount
        return () => clearInterval(intervalId);
    }, [id]);

    const tabs = [
        { id: 'identification', label: 'Identifikasi', icon: faSearch },
        { id: 'comments', label: 'Komentar', icon: faComments }
    ];

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length >= 3) {
            await searchTaxa(query);
        }
    };

    const handleTaxonSelect = (taxon) => {
        setSelectedTaxon(taxon);
        setIdentificationForm(prev => ({
            ...prev,
            taxon_id: taxon.full_data.id,
            identification_level: taxon.rank
        }));
        setSearchQuery('');
        setShowSuggestions(false);
    };
    const handleDisagreeSubmit = async (identificationId) => {
        try {
            const response = await apiFetch(`/observations/${id}/identifications/${identificationId}/disagree`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comment: disagreeComment })
            });

            const data = await response.json();
            if (data.success) {
                setIdentifications(prevIdentifications =>
                    prevIdentifications.map(ident =>
                        ident.id === identificationId
                            ? { ...ident, user_disagreed: true }
                            : ident
                    )
                );
                setShowDisagreeModal(false);
            } else {
                console.error('Gagal menolak identifikasi:', data.message);
            }
        } catch (error) {
            console.error('Error saat menolak identifikasi:', error);
        }
    };

    const handleDisagreeClick = (identificationId) => {
        setSelectedIdentificationId(identificationId);
        setShowDisagreeModal(true);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIdentificationPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleUsernameClick = (comment, e) => {
        e.preventDefault();
        setSelectedUsername(comment.user_name);
        setSelectedCommentId(comment.id);
        setShowUserMenu(true);
    };

    const formatLink = (url) => {
        if (!url.match(/^https?:\/\//i)) {
            return `https://${url}`;
        }
        return url;
    };

    const quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link'],
            ['clean']
        ],
        clipboard: {
            matchVisual: false
        },
        keyboard: {
            bindings: {
                tab: false
            }
        }
    };

    const handleLinkClick = (e) => {
        const target = e.target;
        if (target.tagName === 'A') {
            e.preventDefault();
            const href = target.getAttribute('href');
            if (href) {
                window.open(formatLink(href), '_blank', 'noopener,noreferrer');
            }
        }
    };

    const getTaxonomyLevel = (taxon) => {
        if (taxon.variety) return `${taxon.variety} (Variety)`;
        if (taxon.form) return `${taxon.form} (Form)`;
        if (taxon.species) return `${taxon.species} (Species)`;
        if (taxon.genus) return `${taxon.genus} (Genus)`;
        if (taxon.subfamily) return `${taxon.subfamily} (Subfamily)`;
        if (taxon.tribe) return `${taxon.tribe} (Tribe)`;
        if (taxon.family) return `${taxon.family} (Family)`;
        if (taxon.order) return `${taxon.order} (Order)`;
        if (taxon.class) return `${taxon.class} (Class)`;
        if (taxon.subphylum) return `${taxon.subphylum} (Subphylum)`;
        if (taxon.phylum) return `${taxon.phylum} (Phylum)`;
        if (taxon.kingdom) return `${taxon.kingdom} (Kingdom)`;
        return null;
    };

    // Fungsi untuk mendapatkan tampilan taksa dengan common name
    const getTaxaDisplayWithCommonName = (taxon) => {
        // Debugging: lihat struktur data taxon yang diterima
        console.log('Taxon data in getTaxaDisplayWithCommonName:', taxon);
        
        // Level taksa dari paling rendah ke paling tinggi
        const levels = [
            { key: 'species', commonKey: 'cname_species' },
            { key: 'genus', commonKey: 'cname_genus' },
            { key: 'family', commonKey: 'cname_family' },
            { key: 'order', commonKey: 'cname_order' },
            { key: 'class', commonKey: 'cname_class' },
            { key: 'phylum', commonKey: 'cname_phylum' },
            { key: 'kingdom', commonKey: 'cname_kingdom' }
        ];

        // Cari level taksa terendah yang tersedia
        for (const { key, commonKey } of levels) {
            if (taxon[key]) {
                // Tampilkan dengan common name jika tersedia
                if (taxon[commonKey]) {
                    return `${taxon[key]} (${taxon[commonKey]})`;
                } 
                // Coba cari common name di format lain jika ada
                else if (key === 'species' && taxon.common_name) {
                    return `${taxon[key]} (${taxon.common_name})`;
                }
                return taxon[key];
            }
        }

        // Jika tidak ada level taksa yang tersedia, gunakan scientific_name
        if (taxon.scientific_name) {
            if (taxon.common_name) {
                return `${taxon.scientific_name} (${taxon.common_name})`;
            }
            return taxon.scientific_name;
        }

        return 'Nama tidak tersedia';
    };

    const renderSuggestionsList = (results, containerRef, onClose) => (
        <div
            ref={containerRef}
            className="relative mt-2 border rounded max-h-48 overflow-y-auto bg-white"
        >
            <button
                onClick={onClose}
                className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 z-10"
            >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>
            {results.map((taxon) => (
                <div
                    key={taxon.id}
                    onClick={() => handleTaxonSelect(taxon)}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                >
                    <div className={`${taxon.rank === 'species' ? 'italic' : ''}`}>
                        {taxon.scientific_name}
                        {taxon.common_name && ` | ${taxon.common_name}`}
                        <span className="text-gray-500 text-sm"> – {taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1)}</span>
                    </div>
                    {taxon.family_context && (
                        <div className="text-sm text-gray-600">
                            {taxon.family_context}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    // Fungsi untuk menentukan identifikasi saat ini berdasarkan kriteria
    const getCurrentIdentification = () => {
        if (!identifications || identifications.length === 0) {
            return null;
        }

        // Filter identifikasi yang aktif (tidak ditarik/withdrawn)
        const activeIdentifications = identifications.filter(id => 
            id.is_withdrawn !== 1 && !id.agrees_with_id);
        
        if (activeIdentifications.length === 0) {
            return null;
        }

        // Urutkan berdasarkan jumlah persetujuan (agreement_count)
        const sortedIdentifications = [...activeIdentifications].sort((a, b) => {
            // Konversi agreement_count ke angka untuk perbandingan yang benar
            const countA = parseInt(a.agreement_count) || 0;
            const countB = parseInt(b.agreement_count) || 0;
            
            // Jika jumlah persetujuan sama, ambil yang pertama
            if (countA === countB) {
                return new Date(a.created_at) - new Date(b.created_at);
            }
            
            // Ambil yang terbanyak persetujuannya
            return countB - countA;
        });

        // Kembalikan identifikasi pertama dari hasil pengurutan
        return sortedIdentifications[0];
    };

    const renderIdentifications = () => {
        console.log('Identifications in TabPanel:', identifications);
        if (!identifications || identifications.length === 0) {
            return (
                <div className="text-gray-400 text-center py-4">
                    Belum ada identifikasi
                </div>
            );
        }

        // Group identifications and their agreements
        const groupedIdentifications = identifications.reduce((acc, identification) => {
            if (identification.agrees_with_id) {
                // This is an agreement
                if (!acc[identification.agrees_with_id]) {
                    acc[identification.agrees_with_id] = {
                        main: null,
                        agreements: []
                    };
                }
                acc[identification.agrees_with_id].agreements.push(identification);
            } else {
                // This is a main identification
                if (!acc[identification.id]) {
                    acc[identification.id] = {
                        main: null,
                        agreements: []
                    };
                }
                acc[identification.id].main = identification;
            }
            return acc;
        }, {});

        const sortedIdentifications = Object.values(groupedIdentifications)
            .filter(group => group.main !== null)
            .sort((a, b) => {
                if (a.main.is_first) return -1;
                if (b.main.is_first) return 1;
                return new Date(b.main.created_at) - new Date(a.main.created_at);
            });

        return sortedIdentifications.map(({ main: identification, agreements }) => {
            const currentUsername = localStorage.getItem('username');
            const isOwnIdentification = identification.identifier_name === currentUsername;
            const showActions = true;
            const photoUrl = identification.photo_path
                ? `https://api.talinara.com/storage/${identification.photo_path}`
                : identification.photo_url;

            return (
                <div key={identification.id}>
                    <div className="bg-[#2c2c2c] rounded-lg border border-[#444] shadow p-4 mb-2">
                        <div className="flex justify-between items-start">
                            <div className="flex-grow">
                                <div className="mb-2">
                                    <div className="flex items-center">
                                        <span className={`${identification.is_withdrawn === 1 ? 'line-through text-gray-400' : 'text-lg font-semibold text-white'}`}>
                                            {identification.species || identification.genus || identification.family || identification.kingdom || identification.scientific_name ? (
                                                <>
                                                    <div className="text-medium">{getTaxaDisplayWithCommonName(identification)}</div>
                                                    <div className="text-sm italic text-gray-400">
                                                        {identification.family || identification.genus || identification.species || getTaxonomyLevel(identification)}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="italic">
                                                    {identification.family || identification.genus || identification.species || getTaxonomyLevel(identification) || 'Nama tidak tersedia'}
                                                </div>
                                            )}
                                        </span>
                                        {identification.is_withdrawn === 1 && (
                                            <span className="text-sm text-red-400 ml-2">(Ditarik)</span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-2 space-y-1">
                                    <div
                                        className="text-sm text-gray-400 cursor-pointer hover:text-[#1a73e8] relative"
                                        onMouseEnter={() => {
                                            setShowIdentifierTooltip(true);
                                            setActiveIdentifierId(identification.id);
                                        }}
                                        onMouseLeave={() => {
                                            setShowIdentifierTooltip(false);
                                            setActiveIdentifierId(null);
                                        }}
                                    >
                                        <Link to={`/profile/${identification.user_id}`} className="text-gray-400 hover:text-[#1a73e8]">
                                            Diidentifikasi oleh {identification.identifier_name}
                                        </Link>
                                        {showIdentifierTooltip && activeIdentifierId === identification.id && (
                                            <div className="absolute z-10 bg-[#333] border border-[#444] rounded-lg shadow-lg p-3 mt-1 left-0">
                                                <div className="text-sm">
                                                    <div className="font-medium text-white">{identification.identifier_name}</div>
                                                    {identification.identifier_joined_date && (
                                                        <div className="text-gray-400">
                                                            Bergabung sejak: {new Date(identification.identifier_joined_date).toLocaleDateString('id-ID')}
                                                        </div>
                                                    )}
                                                    {identification.identifier_identification_count && (
                                                        <div className="text-gray-400">
                                                            Total Identifikasi: {identification.identifier_identification_count}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        Tanggal: {new Date(identification.created_at).toLocaleDateString('id-ID')}
                                    </div>
                                </div>

                                {identification.comment && (
                                    <div className="mt-3 text-gray-300 bg-[#333] p-3 rounded border border-[#444]">
                                        <div className="text-sm font-medium mb-1">Catatan:</div>
                                        <div
                                            onClick={handleLinkClick}
                                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(identification.comment) }}
                                            className="[&_a]:text-[#1a73e8] [&_a]:hover:text-[#4285f4] [&_a]:underline"
                                        />
                                    </div>
                                )}
                            </div>

                            {!identification.is_withdrawn && (
                                <div className="flex flex-col items-end">
                                    <div className="text-sm font-medium mb-2">
                                        {Number(identification.agreement_count) > 0 && (
                                            <span className="bg-[#1a73e8]/10 text-[#1a73e8] px-2 py-1 rounded border border-[#1a73e8]/30">
                                                {identification.agreement_count} setuju
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex space-x-2">
                                        {isOwnIdentification ? (
                                            <button
                                                onClick={() => handleWithdrawIdentification(identification.id)}
                                                className="px-3 py-1 rounded bg-yellow-900 text-yellow-200 hover:bg-yellow-800 ring-1 ring-yellow-600/40"
                                            >
                                                <span>Tarik Identifikasi</span>
                                            </button>
                                        ) : (
                                            !identification.user_agreed && (
                                                <>
                                                    <button
                                                        onClick={() => handleAgreeWithIdentification(identification.id)}
                                                        className="px-3 py-1 rounded bg-green-900 text-green-200 hover:bg-green-800 ring-1 ring-green-600/40"
                                                    >
                                                        Setuju
                                                    </button>
                                                    <button
                                                        onClick={() => handleDisagreeClick(identification.id)}
                                                        className="px-3 py-1 rounded bg-red-900 text-red-200 hover:bg-red-800 ring-1 ring-red-600/40"
                                                    >
                                                        Tolak
                                                    </button>
                                                </>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {(identification.photo_path || identification.photo_url) && (
                            <div className="mt-3">
                                <img
                                    src={photoUrl}
                                    alt="Foto identifikasi"
                                    className="max-h-48 w-auto rounded"
                                    onError={(e) => {
                                        console.error('Error loading image:', e);
                                        e.target.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Render agreements as sub-items */}
                    {agreements.map(agreement => {
                        const isCurrentUserAgreement = agreement.identifier_name === currentUsername;
                        return (
                            <div key={agreement.id} className="ml-8 mb-2 bg-[#333] rounded-lg p-3 border-l-2 border-[#1a73e8]">
                                <div className="flex justify-between items-start">
                                    <div className="flex-grow">
                                        <div className="mb-2">
                                            <div className="flex items-center">
                                                <span className={`${agreement.is_withdrawn === 1 ? 'line-through text-gray-400' : 'text-white'}`}>
                                                    {agreement.species || agreement.genus || agreement.family || agreement.kingdom || agreement.scientific_name ? (
                                                        <>
                                                            <div className="text-medium">{getTaxaDisplayWithCommonName(agreement)}</div>
                                                            <div className="text-sm italic text-gray-400">
                                                                {agreement.family || agreement.genus || agreement.species || getTaxonomyLevel(agreement)}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="italic">
                                                            {agreement.family || agreement.genus || agreement.species || getTaxonomyLevel(agreement) || 'Nama tidak tersedia'}
                                                        </div>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <Link to={`/profile/${agreement.user_id}`} className="text-sm text-gray-400 hover:text-[#1a73e8]">
                                                {agreement.identifier_name} menyetujui identifikasi ini
                                            </Link>
                                            <div className="text-xs text-gray-500">
                                                {new Date(agreement.created_at).toLocaleDateString('id-ID')}
                                            </div>
                                        </div>
                                    </div>
                                    {isCurrentUserAgreement && (
                                        <button
                                            onClick={() => handleCancelAgreement(identification.id)}
                                            className="px-3 py-1 text-sm rounded bg-[#444] text-gray-300 hover:bg-[#555]"
                                        >
                                            Batal Setuju
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        });
    };

    // Custom toast styles
    const toastStyles = {
        success: {
            style: {
                background: '#10B981',
                color: 'white',
            },
            iconTheme: {
                primary: 'white',
                secondary: '#10B981',
            },
        },
        error: {
            style: {
                background: '#EF4444',
                color: 'white',
            },
            iconTheme: {
                primary: 'white',
                secondary: '#EF4444',
            },
        }
    };

    // Fungsi untuk mengirim komentar baru
    const handleAddComment = async (comment) => {
        if (!comment.trim()) {
            toast.error('Komentar tidak boleh kosong', toastStyles.error);
            return;
        }

        const loadingToast = toast.loading('Mengirim komentar...');

        try {
            const response = await apiFetch(`/observations/${id}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    comment: comment,
                    observation_id: id,
                    user_name: user?.uname,
                    user_id: user?.id
                })
            });

            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error('Terjadi kesalahan saat menambahkan komentar');
            }

            // Gunakan ID dari response server
            const newComment = {
                id: responseData.data.id,
                comment: comment,
                user_name: user?.uname || responseData.data.user_name,
                user_id: user?.id || responseData.data.user_id,
                created_at: responseData.data.created_at || new Date().toISOString()
            };

            // Update state comments secara lokal
            setComments(prev => [...prev, newComment]);
            
            // Reset form komentar
            setNewComment('');

            toast.dismiss(loadingToast);
            toast.success('Komentar berhasil ditambahkan', toastStyles.success);

        } catch (error) {
            console.error('Error adding comment:', error);
            toast.dismiss(loadingToast);
            toast.error('Gagal menambahkan komentar. Silakan coba lagi.', toastStyles.error);
        }
    };

    // Fungsi untuk menghapus komentar
    const handleDeleteComment = async (commentId) => {
        try {
            const response = await apiFetch(`/observations/${id}/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal menghapus komentar');
            }

            // Update state lokal
            setComments(prev => prev.filter(comment => comment.id !== commentId));

            toast.success('Komentar berhasil dihapus');
            setShowUserMenu(false);

        } catch (error) {
            console.error('Error deleting comment:', error);
            toast.error(error.message || 'Gagal menghapus komentar');
            setShowUserMenu(false);
        }
    };

    // Fungsi untuk melaporkan komentar
    const handleFlagComment = async () => {
        if (!flagReason.trim()) {
            toast.error('Alasan laporan harus diisi');
            return;
        }

        try {
            const response = await apiFetch(`/observations/${id}/comments/${selectedCommentId}/flag`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: flagReason })
            });

            if (!response.ok) {
                throw new Error('Gagal melaporkan komentar');
            }

            toast.success('Komentar berhasil dilaporkan');
            setShowFlagModal(false);
            setFlagReason('');
            setShowUserMenu(false);

        } catch (error) {
            console.error('Error flagging comment:', error);
            toast.error('Gagal melaporkan komentar');
        }
    };

    // Render komentar
    const renderComment = (comment) => {
        if (!comment || !comment.id || comment.deleted_at) return null;

        // Perbaiki pengecekan izin dengan membandingkan user_id
        const canDelete = user && (
            String(comment.user_id) === String(user.id) || // Pemilik komentar
            user.level >= 3 || // Admin/moderator
            String(checklist?.user_id) === String(user.id) // Pemilik checklist
        );

        console.log('Comment:', comment);
        console.log('User:', user);
        console.log('Checklist:', checklist);
        console.log('Can Delete:', canDelete);

        return (
            <div key={comment.id} className="border-b border-[#444] pb-4">
                <div className="flex justify-between">
                    <div className="relative" ref={dropdownRef}>
                        <span
                            className="font-medium cursor-pointer hover:text-[#4285f4] text-white"
                            onClick={(e) => handleUsernameClick(comment, e)}
                        >
                            {comment.user_name || 'Anonymous'}
                        </span>
                        {showUserMenu && selectedCommentId === comment.id && (
                            <div className="absolute z-10 mt-2 w-48 bg-[#2c2c2c] rounded-md shadow-lg py-1 border border-[#444]">
                                <Link
                                    to={`/profile/${comment.user_id}`}
                                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    Lihat Profil
                                </Link>
                                {canDelete && (
                                    <button
                                        onClick={() => {
                                            handleDeleteComment(comment.id);
                                            setShowUserMenu(false);
                                        }}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#333]"
                                    >
                                        Hapus Komentar
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setSelectedCommentId(comment.id);
                                        setShowFlagModal(true);
                                        setShowUserMenu(false);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333]"
                                >
                                    Laporkan
                                </button>
                            </div>
                        )}
                    </div>
                    <span className="text-sm text-gray-400">
                        {new Date(comment.created_at).toLocaleString('id-ID')}
                    </span>
                </div>
                <div
                    className="mt-2 text-gray-300 [&_a]:text-[#1a73e8] [&_a]:hover:text-[#4285f4] [&_a]:underline"
                    dangerouslySetInnerHTML={{ 
                        __html: DOMPurify.sanitize(
                            typeof comment.comment === 'string' ? 
                                comment.comment : 
                                JSON.stringify(comment.comment)
                        )
                    }}
                />
            </div>
        );
    };

    return (
        <div className="bg-[#1e1e1e] rounded-lg shadow-lg p-6 text-white">
            <div className="border-b border-[#444] mb-4">
                <div className="flex space-x-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-2 px-4 flex items-center space-x-2 ${
                                activeTab === tab.id
                                    ? 'border-b-2 border-[#1a73e8] text-[#1a73e8]'
                                    : 'text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            <FontAwesomeIcon icon={tab.icon} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-4">
                {activeTab === 'identification' && (
                    <div>
                        <span className="text-sm text-gray-400">Bantu Pengamat memastikan identifikasinya,
                        dengan memberi komentar, foto pembanding
                        atau usul nama.</span>
                        <div className="mb-4">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Cari takson..."
                                className="w-full p-2 border border-[#444] rounded bg-[#2c2c2c] text-white"
                            />
                            {searchQuery.length >= 3 && searchResults.length > 0 && (
                                <div
                                    ref={suggestionsRef}
                                    className="relative mt-2 border border-[#444] rounded max-h-48 overflow-y-auto bg-[#2c2c2c]"
                                >
                                    <button
                                        onClick={() => {
                                            setShowSuggestions(false);
                                            setSearchQuery('');
                                        }}
                                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-300 z-10"
                                    >
                                        <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                                    </button>
                                    {searchResults.map((taxon) => (
                                        <div
                                            key={taxon.id}
                                            onClick={() => handleTaxonSelect(taxon)}
                                            className="p-2 hover:bg-[#333] cursor-pointer"
                                        >
                                            <div className={`text-white ${taxon.rank === 'species' ? 'italic' : ''}`}>
                                                {taxon.scientific_name}
                                                {taxon.common_name && ` | ${taxon.common_name}`}
                                                <span className="text-gray-400 text-sm"> – {taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1)}</span>
                                            </div>
                                            {taxon.family_context && (
                                                <div className="text-sm text-gray-400">
                                                    {taxon.family_context}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedTaxon && (
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setIsSubmitting(true);
                                try {
                                    await handleIdentificationSubmit(e, identificationPhoto);
                                    setIdentificationPhoto(null);
                                    setPhotoPreview(null);
                                    setSelectedTaxon(null);
                                    setSearchQuery('');
                                    setIdentificationForm(prev => ({
                                        ...prev,
                                        comment: '',
                                        taxon_id: null,
                                        identification_level: null
                                    }));
                                } catch (error) {
                                    console.error('Error submitting identification:', error);
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">
                                        Takson Terpilih
                                    </label>
                                    <div className="mt-1 p-2 border border-[#444] rounded bg-[#333]">
                                        {selectedTaxon.common_name || selectedTaxon.species || selectedTaxon.genus || selectedTaxon.family || selectedTaxon.kingdom || selectedTaxon.scientific_name ? (
                                            <>
                                                <div className="text-medium text-white">{selectedTaxon.common_name || selectedTaxon.species || selectedTaxon.genus || selectedTaxon.family || selectedTaxon.kingdom || selectedTaxon.scientific_name}</div>
                                                <div className="text-sm italic text-gray-400">
                                                    {selectedTaxon.family || selectedTaxon.genus || selectedTaxon.species || getTaxonomyLevel(selectedTaxon)}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="italic text-white">
                                                {selectedTaxon.family || selectedTaxon.genus || selectedTaxon.species || getTaxonomyLevel(selectedTaxon) || 'Nama tidak tersedia'}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300">
                                        Foto Pendukung (Opsional)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="mt-1 block w-full text-sm text-gray-400
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-[#1a73e8] file:text-white
                                        hover:file:bg-[#0d47a1]"
                                    />
                                    {photoPreview && (
                                        <div className="mt-2">
                                            <img
                                                src={photoPreview}
                                                alt="Preview"
                                                className="h-32 w-auto object-cover rounded"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIdentificationPhoto(null);
                                                    setPhotoPreview(null);
                                                }}
                                                className="mt-1 text-sm text-red-400 hover:text-red-300"
                                            >
                                                Hapus foto
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300">
                                        Komentar (Opsional)
                                    </label>
                                    <ReactQuill
                                        value={identificationForm.comment}
                                        onChange={(value) => setIdentificationForm(prev => ({
                                            ...prev,
                                            comment: value
                                        }))}
                                        className="mt-1 bg-[#2c2c2c] text-white border border-[#444] rounded-md"
                                        modules={quillModules}
                                        formats={[
                                            'bold', 'italic', 'underline',
                                            'list', 'bullet',
                                            'link'
                                        ]}
                                        placeholder="Tulis komentar..."
                                        onBlur={(range, source, editor) => {
                                            const element = editor.container.firstChild;
                                            element.addEventListener('click', handleLinkClick);
                                        }}
                                        onUnmount={(range, source, editor) => {
                                            const element = editor.container.firstChild;
                                            element.removeEventListener('click', handleLinkClick);
                                        }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full py-2 px-4 rounded ${
                                        isSubmitting
                                        ? 'bg-[#1a73e8]/60 cursor-not-allowed'
                                        : 'bg-[#1a73e8] hover:bg-[#0d47a1]'
                                    } text-white`}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Mengirim...
                                        </span>
                                    ) : (
                                        'Kirim Identifikasi'
                                    )}
                                </button>
                            </form>
                        )}

                        <div className="mt-6">
                            {identifications.length > 0 && (
                                <div className="mb-4 p-4 bg-[#2c2c2c] rounded border border-[#444]">
                                    <h3 className="font-medium text-white">Identifikasi Saat Ini</h3>
                                    {console.log('Identifikasi terpilih:', getCurrentIdentification())}
                                    {(() => {
                                        const currentId = getCurrentIdentification();
                                        if (!currentId) return (
                                            <div className="italic text-white">
                                                Belum ada identifikasi yang aktif
                                            </div>
                                        );
                                        
                                        return (
                                            <>
                                                <div className="text-medium text-white">{getTaxaDisplayWithCommonName(currentId)}</div>
                                                <div className="text-sm italic text-gray-400">
                                                    {currentId.family || currentId.genus || currentId.species || getTaxonomyLevel(currentId)}
                                                </div>
                                                <p
                                                    className="text-sm text-gray-400 mt-2"
                                                >
                                                    Diidentifikasi oleh <span className="text-[#1a73e8]">{currentId.identifier_name}</span> 
                                                    {currentId.agreement_count > 0 && ` · Disetujui oleh ${currentId.agreement_count} pengamat`}
                                                </p>
                                                
                                                {user &&
                                                currentId.identifier_name !== user.username &&
                                                !currentId.user_agreed && (
                                                    <div className="mt-3 space-x-2">
                                                        <button
                                                            onClick={() => handleAgreeWithIdentification(currentId.id)}
                                                            className="px-3 py-1 rounded bg-green-900 text-green-200 hover:bg-green-800 ring-1 ring-green-600/40"
                                                        >
                                                            Setuju
                                                        </button>
                                                        <button
                                                            onClick={() => handleDisagreeClick(currentId.id)}
                                                            className="px-3 py-1 rounded bg-red-900 text-red-200 hover:bg-red-800 ring-1 ring-red-600/40"
                                                        >
                                                            Tolak
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}

                                    {checklist.iucn_status && (
                                        <div className="mt-2">
                                            <span className="text-sm font-medium text-white">Status IUCN: </span>
                                            <span className={`px-2 py-1 rounded text-sm ${
                                                checklist.iucn_status.toLowerCase().includes('endangered')
                                                    ? 'bg-red-900 text-red-200 ring-1 ring-red-600/40'
                                                    : 'bg-green-900 text-green-200 ring-1 ring-green-600/40'
                                            }`}>
                                                {checklist.iucn_status}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {renderIdentifications()}
                        </div>
                    </div>
                )}

                {activeTab === 'comments' && (
                    <div>
                        <div className="mb-4">
                            <ReactQuill
                                value={newComment}
                                onChange={setNewComment}
                                placeholder="Tulis komentar..."
                                className="bg-[#2c2c2c] text-white border border-[#444] rounded-md"
                            />
                            <button
                                onClick={() => handleAddComment(newComment)}
                                className="mt-2 bg-[#1a73e8] text-white py-2 px-4 rounded hover:bg-[#0d47a1]"
                            >
                                Kirim Komentar
                            </button>
                        </div>

                        <div className="space-y-4">
                            {Array.isArray(comments) && comments.map(comment => renderComment(comment))}
                        </div>
                    </div>
                )}

            </div>

            {/* Modal untuk menolak identifikasi */}
            {showDisagreeModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[#1e1e1e] rounded-lg p-6 w-96 border border-[#444]">
            <h3 className="text-lg font-semibold mb-4 text-white">Tolak Identifikasi</h3>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pilih Takson
                </label>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Cari takson..."
                    className="w-full p-2 border border-[#444] rounded mb-2 bg-[#2c2c2c] text-white"
                />

                {searchResults.length > 0 && (
                    <div
                        ref={modalSuggestionsRef}
                        className="mt-2 border border-[#444] rounded max-h-48 overflow-y-auto bg-[#2c2c2c]"
                    >
                        <button
                            onClick={() => {
                                setShowSuggestions(false);
                                setSearchQuery('');
                            }}
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-300 z-10"
                        >
                            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                        </button>
                        {searchResults.map((taxon) => (
                            <div
                                key={taxon.id}
                                onClick={() => handleTaxonSelect(taxon)}
                                className="p-2 hover:bg-[#333] cursor-pointer"
                            >
                                <div className={`text-white ${taxon.rank === 'species' ? 'italic' : ''}`}>
                                    {taxon.scientific_name}
                                    {taxon.common_name && ` | ${taxon.common_name}`}
                                    <span className="text-gray-400 text-sm"> – {taxon.rank.charAt(0).toUpperCase() + taxon.rank.slice(1)}</span>
                                </div>
                                {taxon.family_context && (
                                    <div className="text-sm text-gray-400">
                                        {taxon.family_context}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {selectedTaxon && (
                    <div className="mt-2 p-2 bg-[#333] rounded border border-[#444]">
                        <div className={`text-white ${selectedTaxon.rank === 'species' ? 'italic' : ''}`}>
                            {selectedTaxon.scientific_name}
                            {selectedTaxon.common_name && ` | ${selectedTaxon.common_name}`}
                            <span className="text-gray-400 text-sm"> – {selectedTaxon.rank.charAt(0).toUpperCase() + selectedTaxon.rank.slice(1)}</span>
                        </div>
                        {selectedTaxon.family_context && (
                            <div className="text-sm text-gray-400">
                                {selectedTaxon.family_context}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Alasan Penolakan
                </label>
                <textarea
                    value={disagreeComment}
                    onChange={(e) => setDisagreeComment(e.target.value)}
                    placeholder="Berikan alasan penolakan..."
                    className="w-full p-2 border rounded border-[#444] bg-[#2c2c2c] text-white"
                    rows={4}
                />
            </div>

            <div className="flex justify-end space-x-2">
                <button
                    onClick={() => {
                        if (!selectedTaxon) {
                            alert('Pilih takson terlebih dahulu');
                            return;
                        }
                        if (!disagreeComment.trim()) {
                            alert('Berikan alasan penolakan');
                            return;
                        }
                        handleDisagreeWithIdentification(selectedIdentificationId, disagreeComment);
                        setShowDisagreeModal(false);
                        setDisagreeComment('');
                        setSearchQuery('');
                        setSelectedTaxon(null);
                    }}
                    className="px-4 py-2 bg-red-900 text-red-200 rounded hover:bg-red-800 ring-1 ring-red-600/40"
                >
                    Kirim
                </button>
                <button
                    onClick={() => {
                        setShowDisagreeModal(false);
                        setDisagreeComment('');
                        setSearchQuery('');
                        setSelectedTaxon(null);
                    }}
                    className="px-4 py-2 bg-[#2c2c2c] text-gray-300 rounded hover:bg-[#333] border border-[#444]"
                >
                    Batal
                </button>
            </div>
        </div>
    </div>
)}

            {/* Modal Flag */}
            {showFlagModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-[#1e1e1e] rounded-lg p-6 w-96 border border-[#444]">
                        <h3 className="text-lg font-semibold mb-4 text-white">Laporkan Komentar</h3>
                        <textarea
                            value={flagReason}
                            onChange={(e) => setFlagReason(e.target.value)}
                            placeholder="Berikan alasan pelaporan..."
                            className="w-full p-2 border rounded mb-4 border-[#444] bg-[#2c2c2c] text-white"
                            rows="4"
                        />
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => {
                                    setShowFlagModal(false);
                                    setFlagReason('');
                                }}
                                className="px-4 py-2 text-gray-300 hover:text-gray-200"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleFlagComment}
                                className="px-4 py-2 bg-red-900 text-red-200 rounded hover:bg-red-800 ring-1 ring-red-600/40"
                            >
                                Laporkan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TabPanel;
