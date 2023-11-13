const Courses = class {
    constructor() {
        this.token = $('#token').text();

        this.socket = io.connect(`http://localhost:${window.ENV.port}`);
        this.socket.emit('getCourses', this.token);

        this.socket.on('getCourses', courses => {
            for(let i = 0; i < courses.length; i++) {
                $('#courses').append(`<li>${courses[i]}</li>`);
            }
        });

        this.socket.on('error', error => {
            const formatted_error = `
                <p>ENCOUNTERED ERROR:<p>
                <br />
                <p>${error}</p>
            `;

            $('#container').html(formatted_error);
        })
    }
}