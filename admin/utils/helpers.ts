import Swal from 'sweetalert2';

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function alert(title: string, text: string, icon = 'success') {
    await Swal.fire({
        title,
        text,
        icon,
        theme: 'dark',
        backdrop: `rgba(0,0,123,0.4) url("https://sweetalert2.github.io/images/nyan-cat.gif") left top no-repeat`,
    });
}

export async function confirm(title: string, text: string, icon = 'question') {
    const result = await Swal.fire({
        title,
        text,
        icon,
        theme: 'dark',
        backdrop: `rgba(0,0,123,0.4) url("https://sweetalert2.github.io/images/nyan-cat.gif") left top no-repeat`,
        showCancelButton: true,
        focusCancel: true,
    });
    return result.isConfirmed;
}

export async function input(title: string) {
    const result = await Swal.fire({
        title,
        input: 'text',
        theme: 'dark',
        backdrop: `rgba(0,0,123,0.4) url("https://sweetalert2.github.io/images/nyan-cat.gif") left top no-repeat`,
        showCancelButton: true,
        focusCancel: true,
    });

    return result.isConfirmed ? result.value : null;
}
