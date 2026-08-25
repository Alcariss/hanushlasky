export function formatDate(dateInput) {
    return new Date(dateInput).toLocaleDateString('cs-CZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
export function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
}
export function cacheAgeText(ageMs) {
    if (ageMs < 60_000) {
        return 'před chvílí';
    }
    if (ageMs < 3_600_000) {
        return `před ${Math.floor(ageMs / 60_000)} min`;
    }
    return `před ${Math.floor(ageMs / 3_600_000)} h`;
}
