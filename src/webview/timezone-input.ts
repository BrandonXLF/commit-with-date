export default class TimezoneInput extends HTMLElement {
    private static tzRegex = /([+-])(\d{2}):(\d{2})/;

    private signInput: HTMLSelectElement;
    private hourInput: HTMLInputElement;
    private minuteInput: HTMLInputElement;

    private subInputChanged = () => {
        this.dispatchEvent(new Event('change'));
    };

    private numberInputChanged = (e: Event) => {
        let input = e.target as HTMLInputElement;
        input.value = input.value.padStart(2, '0');

        this.subInputChanged();
    };

    constructor() {
        super();

        const positiveOption = document.createElement('option');
        positiveOption.textContent = '+';

        const negativeOption = document.createElement('option');
        negativeOption.textContent = '-';

        this.signInput = document.createElement('select');
        this.signInput.append(positiveOption, negativeOption);
        this.signInput.addEventListener('change', this.subInputChanged);

        this.hourInput = document.createElement('input');
        this.hourInput.type = 'number';
        this.hourInput.min = '0';
        this.hourInput.max = '23';
        this.hourInput.addEventListener('change', this.numberInputChanged);

        this.minuteInput = document.createElement('input');
        this.minuteInput.type = 'number';
        this.minuteInput.min = '0';
        this.minuteInput.max = '59';
        this.minuteInput.addEventListener('change', this.numberInputChanged);
    }

    connectedCallback() {
        this.append(this.signInput, this.hourInput, this.minuteInput);
    }

    disconnectedCallback() {
        this.innerHTML = '';
    }

    get value() {
        return (
            this.signInput.value +
            this.hourInput.value +
            ':' +
            this.minuteInput.value
        );
    }

    set value(val: string) {
        const match = TimezoneInput.tzRegex.exec(val);

        if (!match) return;

        const [, sign, hourStr, minStr] = match;

        this.signInput.value = sign;
        this.hourInput.value = hourStr;
        this.minuteInput.value = minStr;
    }
}
