const onlyInLeft = (left, right, compareFunction) => 
  stored_assignments.filter(sta =>
    !current_assignments.some(ca => 
      sta.id === ca.id));

const clipImage = (image, ctx, x, y, plantIndex, growthStage) => {
    let clipX;
    if(plantIndex > 7) {
        clipX = 112;
    } else {
        clipX = 0;
    }

    clipX += growthStage * 16;

    const clipY = (plantIndex % 8) * 16;

    ctx.drawImage(image, clipX, clipY, 16, 16, x * 16, y * 16, 16, 16);
}

const getCell = (canvas, event) => { 
    let rect = canvas.getBoundingClientRect(); 

    let x = event.clientX - rect.left; 
    let y = event.clientY - rect.top; 
    
    return {
        x: (x - (x % 16)) / 16,
        y: (y - (y % 16)) / 16
    };
} 

const Courses = class {
    constructor() {

        this.token = $('#token').text();
        this.user = $('#user').text();

        this.socket = io.connect(`http://localhost:${window.ENV.port}`);

        this.sprite_sheet = new Image();
        this.sprite_sheet.src = '../assets/sprites.png';
        this.sprite_sheet.onload = _ => {
            for(let i = 0; i < 16; i++) {
                $('#purchase-tile').append(`   
                    <div id="purchase-${i}-tile" class="tile is-child is-4 notification">
                        <button id="purchase-${i}-button" class="button">
                        <canvas id="purchase-${i}" width=16 height=16 style="margin: 0 auto; width=100%;"></canvas>
                        </button>
                    </div>
                `);

                $(`#purchase-${i}-button`).on('click', _ => {
                    if(this.selected == i) {
                        $(`#purchase-${i}-tile`).removeClass().addClass('tile is-child is-4 notification');
                        this.selected = undefined;
                    } else {
                        $(`#purchase-${i}-tile`).addClass('is-primary');
                        this.selected = i;
                    }
                });
    
                let ctx = document.getElementById(`purchase-${i}`).getContext('2d');
    
                clipImage(this.sprite_sheet, ctx, 0, 0, i, 6);
            }

            let garden_ctx = document.getElementById('garden-canvas').getContext('2d');
            this.socket.emit('getGarden', this.user);
            this.socket.on('getGarden', garden => {
                for(let i = 0; i < 12; i++) {
                    for(let j = 0; j < 12; j++) {
                        if(garden[i][j] != null) {
                            clipImage(this.sprite_sheet, garden_ctx, i, j, garden[i][j].species, garden[i][j].stage);
                        }
                    }
                }
            });

            console.log(this.user, this.token);

            this.socket.emit('getOldAssignments', { user: this.user, token: this.token });
            this.socket.emit('getResourceCounts', this.user);

            this.socket.on('getResourceCounts', resources => {
                this.resources = resources;

                $('#resources').text(`Seeds: ${this.resources.seeds}`);
            });
            
            $('#garden-canvas').on('mouseup', event => {
                const { x, y } = getCell(document.getElementById('garden-canvas'), event);
                
                if(this.selected != undefined) {
                    this.socket.emit('attemptToPlant', { user: this.user, x: x, y: y, idx: this.selected });
                    this.socket.on('attemptToPlant', data => {
                        if(!data.success) {
                            console.log('Failed to plant...');
                        } else {
                            clipImage(this.sprite_sheet, garden_ctx, x, y, this.selected, 0);
                            this.resources = data.resources;

                            $('#resources').text(`Seeds: ${this.resources.seeds}`);
                        }
                    }); 
                }
            });
            this.socket.on('getOldAssignments', stored_assignments => {
                stored_assignments = stored_assignments ? stored_assignments : [];

                this.socket.emit('getCurrentAssignments', this.token);
                this.socket.on('getCurrentAssignments', current_assignments => {

                    let completed_assignments = stored_assignments.filter(
                        sta => !current_assignments.some(ca => sta.id === ca.id)) || [];
                    
                    for(let i = 0; i < completed_assignments.length; i++) {
                        $('#assignments-column').append(`
                            <div class="box" id="box-${ completed_assignments[i].id }">
                                <div class="title is-5">
                                    ${ completed_assignments[i].title }
                                </div>
                                <div class="subtitle is-6">
                                    ${ completed_assignments[i].course_name }
                                </div>
                                <div class="level">
                                    <div class="level-left">
                                        <div class="level-item">
                                            <div class="container">
                                                <emph>${ completed_assignments[i].due_at }</emph>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="level-right">
                                        <div class="level-item">
                                            <button class="button is-primary" id="assignment-${ completed_assignments[i].id }">
                                                Test
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                            </div>
                        `);
                        $(`#assignment-${completed_assignments[i].id}`).on('click', _ => {
                            $(`#box-${completed_assignments[i].id}`).remove();

                            this.socket.emit('redeemAssignment', this.user);
                        });
                    }
                    for(let i = 0; i < current_assignments.length; i++) {
                        $('#assignments-column').append(`
                            <div class="box">
                                <div class="title is-5">
                                    ${ current_assignments[i].title }
                                </div>
                                <div class="subtitle is-6">
                                    ${ current_assignments[i].course_name }
                                </div>
                                <div class="level">
                                    <div class="level-left">
                                        <div class="level-item">
                                            <div class="container">
                                                <emph>${ current_assignments[i].due_at }</emph>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="level-right">
                                        <div class="level-item"></div>
                                    </div>
                                </div>
                                
                            </div>
                        `);
                    }

                    this.socket.emit('storeAssignments', { 
                        user: this.user, 
                        token: this.token,
                        assignments: current_assignments 
                    });
                });
            });

            this.courses = [];
            this.socket.on('getCourses', courses => this.courses = courses);

            this.socket.on('error', error => {
                const formatted_error = `
                    <p>ENCOUNTERED ERROR:<p>
                    <br />
                    <p>${error}</p>
                `;

                $('.container').html(formatted_error);
            })
        };
    }
}