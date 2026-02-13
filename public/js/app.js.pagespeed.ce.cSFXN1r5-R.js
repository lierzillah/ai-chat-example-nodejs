document.addEventListener('DOMContentLoaded', (e) => {
  //Mob menu
  document.querySelector('.header-burger').addEventListener('click', (e) => {
    console.log('.header-burger');
    document.body.classList.add('mob-menu-open');
    return;
  });
  document.querySelector('.mob-menu-close').addEventListener('click', (e) => {
    document.body.classList.remove('mob-menu-open');
    return;
  });
  document.querySelectorAll('.mob-menu-list a').forEach((el, i) => {
    el.addEventListener('click', (e) => {
      console.log('el', e.target.hash.substr(1));
      document.body.classList.remove('mob-menu-open');
      document.getElementById(e.target.hash.substr(1)).scrollIntoView();
    });
  });

  //Detect system type and show .header-buttons--
  /*
    const systemOS = getOS()
    if (systemOS == 'Windows' || systemOS == 'Android' || systemOS == 'Linux')
        document.querySelector('.header-buttons--googleplay').style.display = 'block'
    else
        document.querySelector('.header-buttons--appstore').style.display = 'block'

    //Scroll to anchor
    document.querySelector('.sc1__col1 .btn').addEventListener('click', (e) => {
        document.getElementById('contact').scrollIntoView()
    })
    */

  function makeid(length) {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }

  var randomId = makeid('10');

  //Accordion
  const accs = document.querySelectorAll('.acc');
  accs.forEach((el, i) => {
    let item = el;
    let heads = el.querySelectorAll('.acc__item-head');

    heads.forEach((el, i) => {
      //init item
      if (!el.parentElement.classList.contains('item-close')) {
        let panel = el.nextElementSibling;
        panel.style.height = parseInt(panel.scrollHeight) + 'px';
        el.querySelector('.acc-open').style.display = 'none';
        el.querySelector('.acc-close').style.display = 'block';
      }

      el.addEventListener('click', function () {
        let panel = this.nextElementSibling;
        if (panel.style.height) {
          panel.style.height = null;
          el.querySelector('.acc-open').style.display = 'block';
          el.querySelector('.acc-close').style.display = 'none';
          el.parentElement.classList.add('item-close');
        } else {
          panel.style.height =
            parseInt(panel.scrollHeight) +
            parseInt(
              getComputedStyle(el).getPropertyValue(
                '--paddingBodyTextTopBottom',
              ),
            ) +
            'px';
          el.querySelector('.acc-open').style.display = 'none';
          el.querySelector('.acc-close').style.display = 'block';
          el.parentElement.classList.remove('item-close');
        }
      });
    });
  });

  //Phone input
  /*
    var input = document.querySelector('#phone');
    window.intlTelInput(input, {
        separateDialCode: true,
        //Default country
        initialCountry: 'ua'
    })
    */

  //Sliders
  const swiper1 = new Swiper('.swiper1', {
    slidesPerView: 1,
    loop: true,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    pagination: {
      el: '.swiper-pagination',
    },
  });

  const swiper2 = new Swiper('.swiper2', {
    loop: true, ////////////
    slidesPerView: 1.2,
    spaceBetween: 16,
    breakpoints: {
      375: {
        slidesPerView: 1.5,
      },
      400: {
        slidesPerView: 1.6,
      },
      475: {
        slidesPerView: 1.9,
      },
      600: {
        slidesPerView: 2.2,
      },
      798: {
        slidesPerView: 2.8,
      },
      930: {
        slidesPerView: 3.2,
        spaceBetween: 8,
      },
    },

    // Navigation arrows
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },

    // Scrollbar
    scrollbar: {
      el: '.swiper-scrollbar',
      draggable: true,
      dragSize: 100,
    },
  });

  let swiper3;

  function initSwiper() {
    const screenWidth = window.innerWidth;

    if (swiper3) swiper3.destroy(true, true);

    swiper3 = new Swiper('.swiper3', {
      loop: true,
      slidesPerView: 1.4,
      spaceBetween: 16,
      autoHeight: true,
      breakpoints: {
        544: {
          slidesPerView: 2.1,
        },
        744: {
          slidesPerView: 2.9,
        },
      },

      // Scrollbar
      scrollbar: {
        el: '.swiper-scrollbar',
        draggable: true,
        dragSize: 100,
      },
    });

    swiper3.update();
  }

  initSwiper();

  window.addEventListener('resize', function () {
    initSwiper();
  });

  //Add listeners for steps buttons
  /*
    document.querySelectorAll('.nextStep').forEach((el, i) => {
        el.addEventListener('click', (e) => {
            nextPrev(1)
        })
    })
    */
  //Add listener for submit
  //contact.addEventListener('submit', submitForm)

  //Form
  /*
    var currentTab = 0
    showTab(currentTab)

    function validateForm() {
        let valid = true
        let tabs = document.getElementsByClassName('tab')
        let inputs = tabs[currentTab].querySelectorAll('input:not([type="checkbox"])')

        //Check empty fields
        for (let i = 0; i < inputs.length; i++) {
            if (inputs[i].value == '') {
                inputs[i].classList.add('invalid')
                document.querySelector('.' + inputs[i].id + '-invalid').innerHTML = 'Обов\'язкове поле'
                valid = false
            } else {
                inputs[i].classList.remove('invalid')
                document.querySelector('.' + inputs[i].id + '-invalid').innerHTML = ''
            }
        }

        //Check emai
        let email = document.getElementById("email")
        let reg = /\S+@\S+\.\S+/;

        if (!reg.test(email.value)) {
            valid = false
            email.classList.add('invalid')
            document.querySelector('.email-invalid').innerHTML = 'Неправильна електронна адреса'
        } else {
            email.classList.remove('invalid')
            document.querySelector('.email-invalid').innerHTML = ''
        }

        //Check #yesno checkbox
        if (!yesno.checked) {
            document.querySelector('.yesno').classList.add('invalid')
            valid = false
        } else {
            document.querySelector('.yesno').classList.remove('invalid')
        }

        return valid
    }

    function submitForm() {
        //console.log('Submit', contact)
        // e.preventDefault()
        let formContact = document.getElementById('contact');
        let data = new FormData(formContact);
        data.delete("yesno");
        data.append("id", randomId);
        data.append("page", "Як стати інвестором");

        //Get phone dial code
        let dialCode = document.getElementsByClassName("iti__selected-dial-code")[0];
        if(dialCode) {
            let phoneCode = dialCode.innerText;
            if(phoneCode !== undefined && phoneCode !== "") {
                var shortPhone = data.get("phone");
                if(shortPhone !== "")
                    data.set("phone", phoneCode + shortPhone);
            }
        }

        for (var [key, value] of data.entries()) {
            //console.log("data[" + key + "] = " + value);
        }        

        //req = new XMLHttpRequest();
        //req.open("POST", "/");
        //req.send(data);

        fetch('https://polza.com/api/user/request', {
             method: 'post',
             body: data
         }).then((res) => {
             console.log('res---',res);
         }).then((txt) => {
             console.log('Submit success ' + txt);
         }).catch((err) => {
             console.log('err---', err);
        });

        // return false
    }



    function showTab(n) {
        var x = document.getElementsByClassName('tab')
        //last tab flex
        n !== 2 ? x[n].style.display = 'block' : x[n].style.display = 'flex'
    }

    function nextPrev(n) {
        
        var x = document.getElementsByClassName('tab')

        if (!validateForm()) return false;

        x[currentTab].style.display = 'none'
        currentTab = currentTab + n

        //console.log("Form step #" + (currentTab+1));

        //if the penultimate step then submit
        if (currentTab >= x.length - 1) {
            submitForm()
        }

        //submitForm();

        showTab(currentTab);
    }
    */
});

function getOS() {
  const userAgent = window.navigator.userAgent,
    platform =
      window.navigator?.userAgentData?.platform || window.navigator.platform,
    macosPlatforms = ['macOS', 'Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
    windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
    iosPlatforms = ['iPhone', 'iPad', 'iPod'];
  let os = null;

  if (macosPlatforms.indexOf(platform) !== -1) {
    os = 'Mac OS';
  } else if (iosPlatforms.indexOf(platform) !== -1) {
    os = 'iOS';
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    os = 'Windows';
  } else if (/Android/.test(userAgent)) {
    os = 'Android';
  } else if (/Linux/.test(platform)) {
    os = 'Linux';
  }

  return os;
}
