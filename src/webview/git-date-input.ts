import TimezoneInput from './timezone-input';

export interface Preset {
    label: string;
    tooltip?: string;
    value: string | (() => string);
}

export default class CommitDateInput extends HTMLElement {
    static globalDefault = CommitDateInput.now();

    static now() {
        const date = new Date();
        const offset = date.getTimezoneOffset();

        date.setMinutes(date.getMinutes() - offset);

        const offsetAbs = Math.abs(offset);
        const hours = Math.floor(offsetAbs / 60)
            .toString()
            .padStart(2, '0');
        const minutes = (offsetAbs % 60).toString().padStart(2, '0');

        return `${date.toISOString().slice(0, 19)}${
            offset > 0 ? '-' : '+'
        }${hours}:${minutes}`;
    }

    static get observedAttributes() {
        return ['label'];
    }

    private readonly aboveRow: HTMLDivElement;
    private readonly inputRow: HTMLDivElement;
    private readonly presetRow: HTMLDivElement;
    private readonly dateInput: HTMLInputElement;
    private readonly timezoneInput: TimezoneInput;
    private readonly alternativeCnt: HTMLDivElement;
    private readonly labelEl: HTMLLabelElement;

    private alternativeInput?: CommitDateInput;
    private alternativeCheck?: HTMLInputElement;
    private alternativeForcedReason?: HTMLElement;

    private subInputChanged = () => {
        this.dispatchEvent(new Event('change'));
    };

    constructor() {
        super();

        this.dateInput = document.createElement('input');
        this.dateInput.type = 'datetime-local';
        this.dateInput.id = 'date-input';
        this.dateInput.step = '1';
        this.dateInput.min = '1970-01-01T00:00';
        this.dateInput.addEventListener('change', this.subInputChanged);

        this.timezoneInput = document.createElement(
            'timezone-input',
        ) as TimezoneInput;
        this.timezoneInput.addEventListener('change', this.subInputChanged);

        this.value = CommitDateInput.globalDefault;

        this.inputRow = document.createElement('div');
        this.inputRow.append(this.dateInput, this.timezoneInput);

        this.labelEl = document.createElement('label');
        this.labelEl.htmlFor = this.dateInput.id;

        this.alternativeCnt = document.createElement('div');

        this.aboveRow = document.createElement('div');
        this.aboveRow.append(this.labelEl, this.alternativeCnt);

        this.presetRow = document.createElement('div');
    }

    connectedCallback() {
        this.append(this.aboveRow, this.inputRow, this.presetRow);
    }

    disconnectedCallback() {
        this.innerHTML = '';
    }

    attributeChangedCallback(name: string, _: string, newValue: string) {
        if (name === 'label') {
            this.label = newValue;
        }
    }

    syncAlternative() {
        const disabled = this.alternativeCheck!.checked;

        this.dateInput.disabled = disabled;
        this.timezoneInput.disabled = disabled;

        this.presetRow?.querySelectorAll('button').forEach((btn) => {
            btn.disabled = disabled;
        });

        if (this.alternativeCheck!.checked) {
            this.value = this.alternativeInput!.value;
        }
    }

    get value() {
        const extra = this.dateInput.value.length < 19 ? ':00' : '';
        return this.dateInput.value + extra + this.timezoneInput.value;
    }

    private set value(str: string) {
        this.dateInput.value = str.substring(0, 19);
        this.timezoneInput.value = str.substring(19);

        this.dispatchEvent(new Event('change'));
    }

    get label() {
        return this.labelEl.textContent ?? '';
    }

    set label(label: string) {
        this.labelEl.textContent = label;
    }

    set alternativeForced(reason: HTMLElement | undefined) {
        if (this.alternativeInput) {
            throw new Error('Must be set before "alternative is set.');
        }

        this.alternativeForcedReason = reason;
    }

    set alternative(alternative: CommitDateInput) {
        if (this.alternativeInput) {
            throw new Error('"alternative" can only be set once.');
        }

        this.alternativeInput = alternative;

        this.alternativeCheck = document.createElement('input');
        this.alternativeCheck.type = 'checkbox';
        this.alternativeCheck.checked = true;

        this.alternativeCheck.addEventListener('change', () =>
            this.syncAlternative(),
        );

        this.alternativeInput.addEventListener('change', () =>
            this.syncAlternative(),
        );

        this.syncAlternative();

        const labelEl = document.createElement('label');
        labelEl.className = 'checkbox-label';

        if (this.alternativeForcedReason) {
            labelEl.append(
                `Using ${this.alternativeInput.label} since `,
                this.alternativeForcedReason
            );
        } else {
            labelEl.append(
                this.alternativeCheck,
                `Use ${this.alternativeInput.label}`,
            );
        }

        this.alternativeCnt.replaceChildren(labelEl);
    }

    set forcedValue(str: string | undefined) {
        this.value = str ?? CommitDateInput.globalDefault;

        if (this.alternativeInput && !this.alternativeForcedReason) {
            this.alternativeCheck!.checked =
                this.value === this.alternativeInput.value;
            this.syncAlternative();
        }
    }

    set presets(presets: Preset[]) {
        this.presetRow.innerHTML = '';

        for (let preset of presets) {
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.textContent = preset.label;
            btn.disabled = this.alternativeCheck?.checked ?? false;

            if (preset.tooltip) {
                btn.title = preset.tooltip;
            }

            btn.addEventListener('click', () => {
                this.value =
                    typeof preset.value === 'function'
                        ? preset.value()
                        : preset.value;
            });

            this.presetRow.append(btn);
        }
    }
}
