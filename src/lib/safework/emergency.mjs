const emptyHospital = () => ({ name: '', address: '', phone: '' });

const splitContact = (value) => {
	const parts = value.split(':').map((part) => part.trim()).filter(Boolean);
	return { name: parts.slice(0, -1).join(': '), phone: parts.at(-1) || '' };
};

export function parseEmergencyDetails(value = '') {
	const result = {
		siteContact: '',
		sitePhone: '',
		firstAider: '',
		firstAiderPhone: '',
		hospitals: [emptyHospital(), emptyHospital(), emptyHospital()],
	};

	for (const rawLine of String(value).split(/\r?\n/)) {
		const line = rawLine.trim();
		let match = line.match(/^Site emergency contact:\s*(.*)$/i);
		if (match) {
			const contact = splitContact(match[1]);
			result.siteContact = contact.name;
			result.sitePhone = contact.phone;
			continue;
		}
		match = line.match(/^First aider:\s*(.*)$/i);
		if (match) {
			const contact = splitContact(match[1]);
			result.firstAider = contact.name;
			result.firstAiderPhone = contact.phone;
			continue;
		}
		match = line.match(/^Hospital\s+([1-3]):\s*(.*)$/i);
		if (match) {
			const index = Number(match[1]) - 1;
			const parts = match[2].split(':').map((part) => part.trim());
			result.hospitals[index] = {
				name: parts.shift() || '',
				phone: parts.length > 1 ? parts.pop() || '' : '',
				address: parts.join(': '),
			};
		}
	}

	return result;
}
