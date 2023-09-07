import { htmlToElements } from './annotator-utils';
import { PdfNoteToolbarBtn } from './pdf-note-toolbar-btn';
import { PdfRegistry } from './pdf-registry';
import { PdfToolbar } from './pdf-toolbar';
import { PdfToolbarBtn } from './pdf-toolbar-btn';

export class PdfAddToOutlineToolbarBtn extends PdfToolbarBtn {

  protected override getIcon() { return '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAACtUlEQVR4Ae3cA4wdUQCF4doNa9u2bdtGWDuqHde2G9a226C2G+2GtacnyRozy3unO/9Jvnj1/mredG669pO6wEfsfXEQhCAgCEFAEIKAIAQBQUAQgoAgBAFBCOI4TnqpIb2kb8B1lrzWguiLl5E7wiL3QxZLBqNB9AVzyxthcW+u6SATHOa2L5LTZJDtwtxXz2SQtcLcV9lkkM4Oc9sLSW/6X1n7hcXeD2lt45+9GWW6PJXfDvssx6UuV+pcqQcJQUAQgoAgBAFBuEFVQRbLPjkQcNtkrGSzdYNquPwUFn0PpKDp+yEViOG6o6aDLHbcxv5KIZNBdon7WEOTQRaJj8bvkPKuf4ewwzb+lTWUKHHunhSwdR1SThbJXofrkK0yWrJypc6VenKAIAQBQQgCx3GySzb7QQjRTG7I3zDXpImdIMRoHc8F8U9pafOBnUwyS57Lb/HDQmWrFE7FIA8lvt23EiTsUbaD4td9SI0ojj6neK2QjSBdxO/bmgpBKif9MQSeDwnxVxCeoPoSpCDjxe87H6QgueSV+HW/pUVggoR9c6XlpvhtIdI37PsMSpBo32R1H53k0Dw138qwHwQEsfRCF5QpslLWuzggXjvg8TlWymQpQJC4Y3STT2J6n6QrQaLHKCFfLR/BUZwgkUHmie3NIYi//kvsToJEBlkutrc0LZ8o11KyJ/Ia6o/ldxSqpvUT5UKlfyKiTJS/Ynp/ZHxQTpT7I60SEaW+rJPTHq6J1655fI5TslbqBe1EuYv/z5U690O4Y8gdQ06U2+yfIJwo914K2g/CiXIhslkK8vY790MIQhCClBCvFSeIuSAZ5L3Et7eSniBmowyR+DaIxxHsRBkloTH+dTfc7vMhRMkstcJkDsQTVCAIQUAQgoAgBAFBCAKCgCAEAUEIAoIQBAQhCCz4ByYkVnkJlQ7pAAAAAElFTkSuQmCC">'; }

  protected override getClassName() { return 'freeform'; }
  protected override getTitle() { return 'Freeform'; }

  protected override selected() {
  }
  protected override unselected() {
  }
}